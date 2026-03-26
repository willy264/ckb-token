import { ccc } from "@ckb-ccc/ccc";

const ADDRESS = "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq27elv4ulvaulty8y6kfp84r36l0dxdhkg0x98wu";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const addrObj = await ccc.Address.fromString(ADDRESS, client);
  
  console.log("=== Checking Live Cells for %s ===", ADDRESS);
  
  const cells = await client.findCells({
    script: addrObj.script,
    scriptType: "lock",
  });

  let count = 0;
  let total = 0n;
  for await (const cell of cells) {
    count++;
    total += cell.cellOutput.capacity;
    console.log(`Cell #${count}: ${Number(cell.cellOutput.capacity) / 100_000_000} CKB (TX: ${cell.outPoint.txHash})`);
  }
  console.log(`\nGrand Total: ${Number(total) / 100_000_000} CKB from ${count} cells.`);
}

main().catch(console.error);
