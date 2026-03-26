import { ccc } from "@ckb-ccc/ccc";

const ADDRESS = "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq27elv4ulvaulty8y6kfp84r36l0dxdhkg0x98wu";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const addrObj = await ccc.Address.fromString(ADDRESS, client);
  
  // Find recent transactions for this address
  const transactions = await client.findTransactions({
    script: addrObj.script,
    scriptType: "lock",
  });

  console.log("=== Recent Transactions ===");
  let count = 0;
  for await (const tx of transactions) {
     count++;
     console.log(`TX #${count}: ${tx.txHash}`);
     if (count >= 5) break; 
  }
}

main().catch(console.error);
