import { ccc } from "@ckb-ccc/ccc";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const txHash = "0xb8b63ae3f0a54e58b79d072bb8978e33ab939da7b4e00ff5be695e0759a5bbcc";
  
  const tx = await client.getTransaction(txHash);
  if (tx) {
    console.log("Status:", tx.status);
    console.log("Block Number:", tx.blockNumber);
    const tip = await client.getTip();
    console.log("Current Tip:", tip);
  }
}
main();
