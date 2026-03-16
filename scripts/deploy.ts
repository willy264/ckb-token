/**
 * Deploy compiled contract binaries to the CKB devnet.
 *
 * Usage:
 *   npx tsx deploy.ts
 *
 * Requires .env with:
 *   - CKB_RPC_URL
 *   - CKB_INDEXER_URL
 *   - OWNER_PRIVATE_KEY
 *   - XUDT_BIN_PATH
 *   - OWNER_LOCK_BIN_PATH
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { RPC, hd, helpers, commons, config as lumosConfig } from "@ckb-lumos/lumos";

// Load environment variables from ../.env
config({ path: path.resolve(__dirname, "../.env") });

const CKB_RPC_URL = process.env.CKB_RPC_URL || "http://127.0.0.1:8114";
const CKB_INDEXER_URL = process.env.CKB_INDEXER_URL || "http://127.0.0.1:8116";
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const XUDT_BIN_PATH =
  process.env.XUDT_BIN_PATH ||
  path.resolve(__dirname, "../target/riscv64imac-unknown-none-elf/release/xudt-type-script");
const OWNER_LOCK_BIN_PATH =
  process.env.OWNER_LOCK_BIN_PATH ||
  path.resolve(
    __dirname,
    "../target/riscv64imac-unknown-none-elf/release/owner-lock-script",
  );

async function deployBinary(
  rpc: RPC,
  binaryPath: string,
  privateKey: string,
  label: string,
): Promise<{ txHash: string; index: string }> {
  console.log(`\nDeploying ${label}...`);
  console.log(`Binary: ${binaryPath}`);

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Binary not found: ${binaryPath}`);
  }

  const binaryData = fs.readFileSync(binaryPath);
  const binaryHex =
    "0x" +
    Array.from(binaryData)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  console.log(`Binary size: ${binaryData.length} bytes`);

  // Derive deployer's address
  const pubKey = hd.key.privateToPublic(privateKey);
  const args = hd.key.publicKeyToBlake160(pubKey);
  const networkConfig = lumosConfig.getConfig();
  const template = networkConfig.SCRIPTS["SECP256K1_BLAKE160"]!;
  const lockScript = {
    codeHash: template.CODE_HASH,
    hashType: template.HASH_TYPE,
    args: args,
  };
  const address = helpers.encodeToAddress(lockScript);
  console.log(`Deployer address: ${address}`);

  // Calculate capacity
  const binarySize = BigInt(binaryData.length);
  const cellOverhead = 61n * 100_000_000n;
  const dataCapacity = binarySize * 100_000_000n;
  const totalCapacity = cellOverhead + dataCapacity;

  // Build transaction
  let txSkeleton = helpers.TransactionSkeleton({});

  txSkeleton = txSkeleton.update("outputs", (outputs: any) =>
    outputs.push({
      cellOutput: {
        capacity: "0x" + totalCapacity.toString(16),
        lock: lockScript,
      },
      data: binaryHex,
    }),
  );

  txSkeleton = await commons.common.injectCapacity(
    txSkeleton,
    [address],
    totalCapacity,
  );

  txSkeleton = await commons.common.payFeeByFeeRate(
    txSkeleton,
    [address],
    1000,
  );

  txSkeleton = commons.common.prepareSigningEntries(txSkeleton);

  const signingEntries = txSkeleton.get("signingEntries").toArray();
  const signatures = signingEntries.map((entry: any) =>
    hd.key.signRecoverable(entry.message, privateKey),
  );

  const signedTxSkeleton = helpers.sealTransaction(txSkeleton, signatures);
  const signedTx = helpers.createTransactionFromSkeleton(signedTxSkeleton);

  const txHash = await rpc.sendTransaction(signedTx, "passthrough");
  console.log(`${label} deployed! TX Hash: ${txHash}`);
  console.log(`Out Point: ${txHash}:0x0`);

  return { txHash, index: "0x0" };
}

async function main() {
  if (!OWNER_PRIVATE_KEY) {
    console.error("Error: OWNER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  // Initialize Lumos config for devnet/testnet
  lumosConfig.initializeConfig(lumosConfig.predefined.AGGRON4);

  const rpc = new RPC(CKB_RPC_URL);

  console.log("=== CKB xUDT Token Contract Deployment ===");
  console.log(`RPC URL: ${CKB_RPC_URL}`);
  console.log(`Indexer URL: ${CKB_INDEXER_URL}`);

  // Deploy xUDT Type Script
  const xudt = await deployBinary(rpc, XUDT_BIN_PATH, OWNER_PRIVATE_KEY, "xUDT Type Script");

  // Wait for the first transaction to be confirmed
  console.log("\nWaiting for xUDT deployment confirmation...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Deploy Owner Lock Script
  const ownerLock = await deployBinary(
    rpc,
    OWNER_LOCK_BIN_PATH,
    OWNER_PRIVATE_KEY,
    "Owner Lock Script",
  );

  console.log("\n=== Deployment Summary ===");
  console.log(`xUDT Type Script TX: ${xudt.txHash}`);
  console.log(`xUDT Type Script Index: ${xudt.index}`);
  console.log(`Owner Lock Script TX: ${ownerLock.txHash}`);
  console.log(`Owner Lock Script Index: ${ownerLock.index}`);
  console.log("\nUpdate your .env file with these values:");
  console.log(`XUDT_TX_HASH=${xudt.txHash}`);
  console.log(`XUDT_TX_INDEX=${xudt.index}`);
  console.log(`OWNER_LOCK_TX_HASH=${ownerLock.txHash}`);
  console.log(`OWNER_LOCK_TX_INDEX=${ownerLock.index}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
