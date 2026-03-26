/**
 * Example script: Transfer tokens between addresses.
 *
 * Usage:
 *   npx tsx transfer-token.ts
 *
 * Requires .env with deployed contract details.
 */

import * as path from "path";
import { config } from "dotenv";
import { hd, helpers, config as lumosConfig, utils } from "@ckb-lumos/lumos";

config({ path: path.resolve(__dirname, "../.env") });

import { CkbClient } from "../mcp-sdk/src/client";
import { transferToken } from "../mcp-sdk/src/tools/transfer";
import { computeScriptHash } from "../mcp-sdk/src/utils/hash";

const CKB_RPC_URL = process.env.CKB_RPC_URL || "http://127.0.0.1:8114";
const CKB_INDEXER_URL = process.env.CKB_INDEXER_URL || "http://127.0.0.1:8116";
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const XUDT_CODE_HASH = process.env.XUDT_CODE_HASH || "";
const XUDT_HASH_TYPE = (process.env.XUDT_HASH_TYPE || "data1") as "type" | "data" | "data1";
const OWNER_LOCK_HASH = process.env.OWNER_LOCK_HASH || "";

// Configuration — edit these values
const TRANSFER_AMOUNT = "100000"; // Amount to transfer
const RECIPIENT_ADDRESS = ""; // Set the recipient address here

async function main() {
  if (!OWNER_PRIVATE_KEY) {
    console.error("Error: OWNER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  if (!RECIPIENT_ADDRESS) {
    console.error("Error: Set RECIPIENT_ADDRESS in this script");
    process.exit(1);
  }

  lumosConfig.initializeConfig(lumosConfig.predefined.AGGRON4);

  const client = new CkbClient({
    rpcUrl: CKB_RPC_URL,
    indexerUrl: CKB_INDEXER_URL,
  });

  // Derive sender address
  const pubKey = hd.key.privateToPublic(OWNER_PRIVATE_KEY);
  const args = hd.key.publicKeyToBlake160(pubKey);
  const template = lumosConfig.getConfig().SCRIPTS["SECP256K1_BLAKE160"]!;
  const senderAddress = helpers.encodeToAddress({
    codeHash: template.CODE_HASH,
    hashType: template.HASH_TYPE,
    args: args,
  });

  // Compute owner lock hash if not set
  let ownerLockHash = OWNER_LOCK_HASH;
  if (!ownerLockHash) {
    ownerLockHash = computeScriptHash({
      codeHash: template.CODE_HASH,
      hashType: template.HASH_TYPE,
      args: args,
    });
  }

  console.log("=== Transferring xUDT Tokens ===");
  console.log(`From: ${senderAddress}`);
  console.log(`To: ${RECIPIENT_ADDRESS}`);
  console.log(`Amount: ${TRANSFER_AMOUNT}`);

  try {
    const result = await transferToken(
      client,
      {
        fromAddress: senderAddress,
        toAddress: RECIPIENT_ADDRESS,
        amount: TRANSFER_AMOUNT,
        privateKey: OWNER_PRIVATE_KEY,
      },
      XUDT_CODE_HASH,
      XUDT_HASH_TYPE,
      ownerLockHash,
    );

    console.log("\n=== Transfer Successful ===");
    console.log(`TX Hash: ${result.txHash}`);
    console.log(`Amount: ${result.amount}`);
    console.log(`From: ${result.fromAddress}`);
    console.log(`To: ${result.toAddress}`);
  } catch (error: any) {
    console.error("Transfer failed:", error.message);
    process.exit(1);
  }
}

main();
