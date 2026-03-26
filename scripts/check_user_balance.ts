import { ccc } from "@ckb-ccc/ccc";

const ADDRESS = "ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqxl3u8sefu0j63j5smuzx0fqqgzlfe745ur9uqm5";

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const addrObj = await ccc.Address.fromString(ADDRESS, client);
  const capacity = await client.getBalance([addrObj.script]);

  console.log("User Address:", ADDRESS);
  console.log("Total CKB:", (Number(capacity) / 100_000_000).toLocaleString());
}

main().catch(console.error);
