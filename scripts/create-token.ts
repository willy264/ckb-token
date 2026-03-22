/**
 * Create (issue) a new xUDT token using CCC, following the Nervos docs.
 *
 * Usage:
 *   npx tsx create-token.ts
 *
 * Requires .env with:
 *   - CKB_RPC_URL
 *   - CKB_NETWORK (devnet | testnet | mainnet)
 *   - OWNER_PRIVATE_KEY
 *   - OWNER_ADDRESS (optional, recipient of the initial issue)
 *   - TOKEN_AMOUNT (optional, defaults to 1 trillion)
 */

import * as path from "path";
import { config } from "dotenv";
import { ccc } from "@ckb-ccc/ccc";

config({ path: path.resolve(__dirname, "../.env") });

const CKB_RPC_URL = process.env.CKB_RPC_URL || "http://127.0.0.1:8114";
const CKB_NETWORK = (process.env.CKB_NETWORK || "devnet") as
  | "devnet"
  | "testnet"
  | "mainnet";
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || "";
const OWNER_ADDRESS = process.env.OWNER_ADDRESS || "";
const TOKEN_AMOUNT = process.env.TOKEN_AMOUNT || "1000000000000"; // 1 trillion

function normalizePrivateKey(hex: string): string {
  if (!hex) return hex;
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

function createCccClient() {
  const cccAny = ccc as any;

  if (cccAny.Client?.fromUrl) {
    return cccAny.Client.fromUrl(CKB_RPC_URL, CKB_NETWORK);
  }

  if (cccAny.Client?.new) {
    return cccAny.Client.new(CKB_NETWORK);
  }

  if (CKB_NETWORK === "testnet" && cccAny.ClientPublicTestnet) {
    return new cccAny.ClientPublicTestnet();
  }

  if (CKB_NETWORK === "mainnet" && cccAny.ClientPublicMainnet) {
    return new cccAny.ClientPublicMainnet();
  }

  throw new Error(
    "Unable to create CCC client. Please check your @ckb-ccc/ccc version.",
  );
}

async function main() {
  if (!OWNER_PRIVATE_KEY) {
    console.error("Error: OWNER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const client = createCccClient();
  const signer = new ccc.SignerCkbPrivateKey(
    client,
    normalizePrivateKey(OWNER_PRIVATE_KEY),
  );

  const issuerAddressObj = await signer.getAddressObjSecp256k1();
  const issuerLock = issuerAddressObj.script;

  const recipientLock = OWNER_ADDRESS
    ? (await ccc.Address.fromString(OWNER_ADDRESS, client)).script
    : issuerLock;

  // xUDT args = issuer lock hash + 4-byte suffix per standard
  const xudtArgs = issuerLock.hash() + "00000000";
  const xudtType = await ccc.Script.fromKnownScript(
    signer.client,
    ccc.KnownScript.XUdt,
    xudtArgs,
  );

  const tx = ccc.Transaction.from({
    outputs: [{ lock: recipientLock, type: xudtType }],
    outputsData: [ccc.numLeToBytes(TOKEN_AMOUNT, 16)],
  });

  await tx.addCellDepsOfKnownScripts(signer.client, ccc.KnownScript.XUdt);
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000);

  const txHash = await signer.sendTransaction(tx);

  console.log("=== xUDT Token Created ===");
  console.log(`Network: ${CKB_NETWORK}`);
  console.log(`RPC: ${CKB_RPC_URL}`);
  console.log(`Amount: ${TOKEN_AMOUNT}`);
  console.log(`Token ID (xudt args): ${xudtArgs}`);
  console.log(`TX Hash: ${txHash}`);
}

main().catch((err) => {
  console.error("Create token failed:", err.message || err);
  process.exit(1);
});
