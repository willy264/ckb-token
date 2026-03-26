import { ccc } from "@ckb-ccc/ccc";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const txHash = "0xae54ca439498125fc5be5c187245c1456c326097d6e39a2195af3aedc18aec61";
  
  const tx = await client.getTransaction(txHash);
  if (tx) {
    console.log("Status:", tx.status);
    const signedTx = tx.transaction;
    
    signedTx.outputs.forEach((output, index) => {
        console.log(`\nOutput #${index}:`);
        console.log(`  Capacity: ${output.capacity.toString()} (${Number(output.capacity)/100000000} CKB)`);
        console.log(`  Lock Hash: ${output.lock.hash()}`);
        if (output.type) {
           console.log(`  Type Code Hash: ${output.type.codeHash}`);
           console.log(`  Type Args: ${output.type.args}`);
           if (signedTx.outputsData[index] && signedTx.outputsData[index].length >= 34) {
               const u128Bytes = ccc.bytesFrom(signedTx.outputsData[index]).slice(0, 16);
               console.log(`  Amount: ${ccc.numLeFromBytes(u128Bytes).toString()}`);
           }
        } else {
            console.log("  No Type Script");
        }
    });
  }
}
main();
