import { ccc } from "@ckb-ccc/ccc";
import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

config({ path: path.resolve(__dirname, "../.env") });

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const XUDT_BIN_PATH = path.resolve(__dirname, "../target/riscv64imac-unknown-none-elf/release/xudt-type-script");

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const signer = new ccc.SignerCkbPrivateKey(client, OWNER_PRIVATE_KEY);
  const fromAddress = await signer.getRecommendedAddress();

  console.log("=== Redeploying xUDT Binary (Robust Collection) ===");
  console.log(`Address: ${fromAddress}`);

  const binaryData = fs.readFileSync(XUDT_BIN_PATH);
  const binaryHex = "0x" + binaryData.toString("hex");
  const dataSize = BigInt(binaryData.length);
  const requiredCapacity = (dataSize + 100n) * 100_000_000n; // Safety margin for overhead

  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: (await ccc.Address.fromString(fromAddress, client)).script,
      },
    ],
    outputsData: [binaryHex],
  });

  console.log(`Requires approx ${Number(requiredCapacity)/100000000} CKB`);
  console.log("Completing inputs and fee...");
  
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);

  console.log("Signing and sending transaction...");
  const txHash = await signer.sendTransaction(tx);

  console.log("\n=== Deployment Successful! ===");
  console.log(`NEW_XUDT_TX_HASH=${txHash}`);
}

main().catch((err) => {
  console.error("\nDeployment failed:", err.message || err);
  process.exit(1);
});
