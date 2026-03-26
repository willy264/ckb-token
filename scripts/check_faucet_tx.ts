import { ccc } from "@ckb-ccc/ccc";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const txHash = "0x2fcde7932ca949f99ec32eb7ab21be5c5067060768527ce87db1559989bca292";
  
  const tx = await client.getTransaction(txHash);
  if (tx) {
    console.log("Status:", tx.status);
    if (tx.status === "committed") {
      console.log("Block Number:", tx.blockNumber);
    }
  } else {
    console.log("Transaction not found on testnet.");
  }
}
main();
