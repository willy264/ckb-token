/**
 * Example script: Mint initial token supply.
 *
 * Usage:
 *   npx tsx mint-token.ts
 *
 * Requires .env with deployed contract details.
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { hd, helpers, commons, config as lumosConfig, utils } from "@ckb-lumos/lumos";

config({ path: path.resolve(__dirname, "../.env") });

import { CkbClient } from "../mcp-sdk/src/client";
import { mintToken } from "../mcp-sdk/src/tools/mint";
import { computeScriptHash } from "../mcp-sdk/src/utils/hash";

const CKB_RPC_URL = process.env.CKB_RPC_URL || "http://127.0.0.1:8114";
const CKB_INDEXER_URL = process.env.CKB_INDEXER_URL || "http://127.0.0.1:8116";
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const XUDT_CODE_HASH = process.env.XUDT_CODE_HASH || "";
const XUDT_HASH_TYPE = (process.env.XUDT_HASH_TYPE || "data1") as "type" | "data" | "data1";

// Configuration
const MINT_AMOUNT = "1000000000000"; // 1 trillion tokens
const RECIPIENT_ADDRESS = process.env.OWNER_ADDRESS || "";

async function main() {
  if (!OWNER_PRIVATE_KEY) {
    console.error("Error: OWNER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  // Use either testnet or local devnet config
  if (process.env.CKB_NETWORK === "testnet") {
    console.log("Initializing for Testnet (Aggron)...");
    lumosConfig.initializeConfig(lumosConfig.predefined.AGGRON4);
  } else {
    console.log("Initializing for local Devnet...");
    const devnetConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../lumos_config.json"), "utf8"));
    lumosConfig.initializeConfig(devnetConfig);
  }

  const client = new CkbClient({
    rpcUrl: CKB_RPC_URL,
    indexerUrl: CKB_INDEXER_URL,
  });

  // Derive address if not set
  let recipientAddress = RECIPIENT_ADDRESS;
  if (!recipientAddress) {
    const pubKey = hd.key.privateToPublic(OWNER_PRIVATE_KEY);
    const args = hd.key.publicKeyToBlake160(pubKey);
    const template = lumosConfig.getConfig().SCRIPTS["SECP256K1_BLAKE160"]!;
    recipientAddress = helpers.encodeToAddress({
      codeHash: template.CODE_HASH,
      hashType: template.HASH_TYPE,
      args: args,
    });
  }

  console.log("=== Minting xUDT Tokens ===");
  console.log(`Recipient: ${recipientAddress}`);
  console.log(`Amount: ${MINT_AMOUNT}`);
  console.log(`xUDT Code Hash: ${XUDT_CODE_HASH}`);

  // Compute owner lock hash for logging (same as what mintToken does)
  const pubKey = hd.key.privateToPublic(OWNER_PRIVATE_KEY);
  const args = hd.key.publicKeyToBlake160(pubKey);
  const template = lumosConfig.getConfig().SCRIPTS["SECP256K1_BLAKE160"]!;
  const ownerLockHash = computeScriptHash({
    codeHash: template.CODE_HASH,
    hashType: template.HASH_TYPE as any,
    args: args,
  });
  console.log(`Owner Lock Hash: ${ownerLockHash}`);

  try {
    const result = await mintToken(
      client,
      {
        toAddress: recipientAddress,
        amount: MINT_AMOUNT,
        privateKey: OWNER_PRIVATE_KEY,
      },
      XUDT_CODE_HASH,
      XUDT_HASH_TYPE,
    );

    console.log("\n=== Mint Successful ===");
    console.log(`TX Hash: ${result.txHash}`);
    console.log(`Amount minted: ${result.amount}`);
    console.log(`Recipient: ${result.toAddress}`);
  } catch (error: any) {
    console.error("Mint failed:", error.message);
    process.exit(1);
  }
}

main();
