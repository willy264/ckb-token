import { ccc } from "@ckb-ccc/ccc";

const ADDRESS = "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq27elv4ulvaulty8y6kfp84r36l0dxdhkg0x98wu";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const addrObj = await ccc.Address.fromString(ADDRESS, client);
  const capacity = await client.getBalance([addrObj.script]);

  const ckb = Number(capacity) / 100_000_000;
  console.log(`\nACCOUNT SUMMARY: ${ADDRESS}`);
  console.log(`BALANCE: ${ckb.toLocaleString()} CKB`);
  console.log(`REQUIRED: 170,000 CKB (for contract storage)`);
  if (ckb < 170000) {
    console.log(`STATUS: INSUFFICIENT FUNDS (Need ${Math.ceil(170000 - ckb).toLocaleString()} more CKB)`);
  } else {
    console.log(`STATUS: READY FOR DEPLOYMENT`);
  }
}

main().catch(console.error);
