import { ccc } from "@ckb-ccc/ccc";

const USER_ADDRESS = "ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqxl3u8sefu0j63j5smuzx0fqqgzlfe745ur9uqm5";
const XUDT_CODE_HASH = "0xbb26ebb0d7b1deb6d9748be6e37a4cccd171d889200c558835e60bf5d1ccace3";
const DEPLOY_TX_HASH = "0xb8b63ae3f0a54e58b79d072bb8978e33ab939da7b4e00ff5be695e0759a5bbcc";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  
  console.log("=== Checking Real-time Sync Status ===");
  
  // 1. Check Deployment TX depth
  const deployTx = await client.getTransaction(DEPLOY_TX_HASH);
  const tip = await client.getTip();
  
  if (deployTx && deployTx.status === "committed") {
      const depth = Number(tip - deployTx.blockNumber);
      console.log(`Deployment TX was committed at block ${deployTx.blockNumber}`);
      console.log(`Current Tip: ${tip}`);
      console.log(`Confirmation Depth: ${depth} blocks`);
  } else {
      console.log("Deployment TX not found or not committed yet.");
  }

  // 2. Check balance manually via indexer
  console.log("\nSearching for xUDT cells...");
  const addrObj = await ccc.Address.fromString(USER_ADDRESS, client);
  const cells = await client.findCells({
    script: addrObj.script,
    scriptType: "lock",
  });

  let total = 0n;
  for await (const cell of cells) {
    if (cell.cellOutput.type && cell.cellOutput.type.codeHash === XUDT_CODE_HASH) {
      if (cell.outputData.length >= 34) {
          const u128Bytes = ccc.bytesFrom(cell.outputData).slice(0, 16);
          total += ccc.numLeFromBytes(u128Bytes);
      }
    }
  }

  console.log(`Manual Indexer balance for ${USER_ADDRESS}: ${Number(total) / 10**8} xUDT`);
}

main().catch(console.error);
