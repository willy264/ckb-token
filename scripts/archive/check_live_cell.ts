import { ccc } from "@ckb-ccc/ccc";

const DEPLOY_TX_HASH = "0x2fcde7932ca949f99ec32eb7ab21be5c5067060768527ce87db1559989bca292";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  
  console.log(`Checking Live Status for Cell Dep: ${DEPLOY_TX_HASH}:0`);
  
  try {
      const cell = await client.getCell({
          txHash: DEPLOY_TX_HASH,
          index: 0,
      });
      if (cell) {
          console.log("CELL IS ALIVE! Capacity:", Number(cell.cellOutput.capacity) / 100_000_000, "CKB");
          console.log("Data length:", cell.outputData.length);
      } else {
          console.log("CELL IS DEAD OR UNKNOWN.");
          
          // Let's check the transaction status directly
          const txInfo = await client.getTransaction(DEPLOY_TX_HASH);
          console.log("Deploy TX Status:", txInfo ? txInfo.status : "Not found");
      }
  } catch(e: any) {
      console.error("Error querying cell:", e.message);
  }
}

main().catch(console.error);
