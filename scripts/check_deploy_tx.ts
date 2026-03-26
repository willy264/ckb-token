import { ccc } from "@ckb-ccc/ccc";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const txHash = "0xb8b63ae3f0a54e58b79d072bb8978e33ab939da7b4e00ff5be695e0759a5bbcc";
  
  const tx = await client.getTransaction(txHash);
  if (tx) {
    const signedTx = tx.transaction;
    console.log(`\nOutputs for ${txHash}:`);
    signedTx.outputs.forEach((output, index) => {
        console.log(`\nOutput #${index}:`);
        console.log(`  Data size: ${signedTx.outputsData[index] ? (signedTx.outputsData[index].length - 2) / 2 : 0} bytes`);
        console.log(`  Lock Hash: ${output.lock.hash()}`);
        console.log(`  Capacity: ${output.capacity.toString()}`);
    });
  }
}
main();
