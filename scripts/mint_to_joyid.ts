import { ccc } from "@ckb-ccc/ccc";
import { config } from "dotenv";
import * as path from "path";

config({ path: path.resolve(__dirname, "../.env") });

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const XUDT_TX_HASH = process.env.XUDT_TX_HASH!;
const XUDT_CODE_HASH = process.env.XUDT_CODE_HASH!;
const XUDT_HASH_TYPE = process.env.XUDT_HASH_TYPE || "type";
const XUDT_TX_INDEX = Number(process.env.XUDT_TX_INDEX || "0");

const RECIPIENT_ADDRESS = "ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqxl3u8sefu0j63j5smuzx0fqqgzlfe745ur9uqm5";
const AMOUNT = 1_000_000_000n * 100_000_000n; // 1 Billion tokens (scaled)

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const signer = new ccc.SignerCkbPrivateKey(client, OWNER_PRIVATE_KEY);
  const fromAddress = await signer.getRecommendedAddress();

  console.log("=== Minting xUDT Directly to JoyID ===");
  console.log(`From Address:      ${fromAddress}`);
  console.log(`Recipient Address: ${RECIPIENT_ADDRESS}`);
  console.log(`Amount:            1,000,000,000 tokens`);

  // 1. Compute the owner lock hash (issuer)
  const addrObj = await ccc.Address.fromString(fromAddress, client);
  const ownerLockHash = addrObj.script.hash();
  console.log(`Owner Lock Hash:   ${ownerLockHash}`);

  // 2. Build the xUDT type script
  const xudtType = await ccc.Script.from({
    codeHash: XUDT_CODE_HASH,
    hashType: XUDT_HASH_TYPE as any,
    args: ownerLockHash,
  });
  console.log(`xUDT Type Hash:    ${xudtType.hash()}`);

  // 3. Construct transaction
  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: (await ccc.Address.fromString(RECIPIENT_ADDRESS, client)).script,
        type: xudtType,
      },
    ],
    outputsData: [ccc.numLeToBytes(AMOUNT, 16)],
  });

  // 4. Add the Cell Dependency for the xUDT binary
  tx.addCellDeps({
      outPoint: {
          txHash: XUDT_TX_HASH,
          index: XUDT_TX_INDEX,
      },
      depType: "code",
  });

  console.log("Completing transaction...");
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);

  console.log("Signing and sending transaction...");
  const txHash = await signer.sendTransaction(tx);

  console.log("\n=== Mint Successful! ===");
  console.log(`TX Hash: ${txHash}`);
  console.log(`URL:     https://explorer.nervos.org/aggron/transaction/${txHash}`);
}

main().catch((err) => {
  console.error("\nMint failed:", err.message || err);
  process.exit(1);
});
