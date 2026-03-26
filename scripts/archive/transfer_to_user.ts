import { ccc } from "@ckb-ccc/ccc";
import { config } from "dotenv";
import * as path from "path";

config({ path: path.resolve(__dirname, "../.env") });

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const XUDT_CODE_HASH = process.env.XUDT_CODE_HASH!;
const XUDT_HASH_TYPE = (process.env.XUDT_HASH_TYPE || "data1") as any;

const RECIPIENT_ADDRESS = "ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqxl3u8sefu0j63j5smuzx0fqqgzlfe745ur9uqm5";
const AMOUNT_SCALED = 1_000_000n * 100_000_000n; // 1M tokens assuming 8 decimals

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const signer = new ccc.SignerCkbPrivateKey(client, OWNER_PRIVATE_KEY);
  const fromAddress = await signer.getRecommendedAddress();

  console.log("=== xUDT Token Transfer to User ===");
  console.log(`From Address:      ${fromAddress}`);
  console.log(`Recipient Address: ${RECIPIENT_ADDRESS}`);
  console.log(`Amount:            1,000,000 tokens (${AMOUNT_SCALED.toString()} units)`);

  // 1. Compute the xUDT script for the issuer
  const ownerLock = (await ccc.Address.fromString(fromAddress, client)).script;
  const xudtArgs = ownerLock.hash();

  const typeScript = await ccc.Script.from({
    codeHash: XUDT_CODE_HASH,
    hashType: XUDT_HASH_TYPE,
    args: xudtArgs,
  });

  console.log(`xUDT Type Hash:    ${typeScript.hash()}`);

  // 2. Build the transaction
  // CCC has a high-level transfer method that handles UDTs automatically if using `transfer`
  // But for specific xUDTs, we might need to be more explicit or use `udt` helpers.
  // We'll use the signer's `send` which handles capacity and cell collection.

  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: (await ccc.Address.fromString(RECIPIENT_ADDRESS, client)).script,
        type: typeScript,
      },
    ],
    outputsData: [ccc.numLeToBytes(AMOUNT_SCALED, 16)],
  });

  console.log("\nCalculating capacity and completing tx...");
  
  // Adding a change output for the remaining xUDTs and CKB
  await tx.addOutput({
    lock: ownerLock,
    type: typeScript,
  }, ccc.numLeToBytes(0n, 16)); // Will be updated by balance adjustment

  // Auto-complete the transaction (collect inputs, pay fees, add change)
  await tx.completeInputsByUdt(signer, typeScript);
  await tx.completeInputsByCapacity(signer);
  await tx.completeOutputsByUdt(signer, typeScript);
  await tx.completeOutputsByCapacity(signer);

  console.log("Signing and sending transaction...");
  const txHash = await signer.sendTransaction(tx);

  console.log("\n=== Transfer Successful! ===");
  console.log(`TX Hash: ${txHash}`);
  console.log(`URL:     https://explorer.nervos.org/aggron/transaction/${txHash}`);
}

main().catch((err) => {
  console.error("\nTransfer failed:", err.message || err);
  process.exit(1);
});
