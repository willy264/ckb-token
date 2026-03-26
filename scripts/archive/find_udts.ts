import { ccc } from "@ckb-ccc/ccc";
import { config } from "dotenv";
import * as path from "path";

config({ path: path.resolve(__dirname, "../.env") });

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY!;
const XUDT_CODE_HASH = process.env.XUDT_CODE_HASH!;

async function main() {
  const client = new ccc.ClientPublicTestnet();
  const signer = new ccc.SignerCkbPrivateKey(client, OWNER_PRIVATE_KEY);
  const fromAddress = await signer.getRecommendedAddress();

  console.log("From Address:", fromAddress);
  const addrObj = await ccc.Address.fromString(fromAddress, client);
  const lock = addrObj.script;
  const lockHash = lock.hash();

  console.log("Lock Hash (Issuer):", lockHash);
  
  // Now find all cells for this lock
  const cells = await client.findCells({
    script: lock,
    scriptType: "lock",
    scriptSearchMode: "exact",
  });

  console.log("\nSearching for xUDT cells...");
  let found = false;
  for await (const cell of cells) {
    if (cell.cellOutput.type) {
      console.log(`Cell found with Type Code Hash: ${cell.cellOutput.type.codeHash}`);
      console.log(`Cell Type Args: ${cell.cellOutput.type.args}`);
      if (cell.cellOutput.type.args === lockHash) {
         console.log("MATCH FOUND for this lock hash as args!");
      }
      found = true;
    }
  }
  if (!found) console.log("No typed cells found.");
}
main();
