import * as fs from "fs";
import * as path from "path";

async function main() {
  const logPath = path.resolve(__dirname, "redeploy_v2.log");
  const log = fs.readFileSync(logPath, "utf16le");
  // The log has garbled lines, let's find all hex strings
  const hexes = log.match(/0x[0-9a-f]{64}/i);
  if (hexes) {
    console.log("CLEAN_HASH=" + hexes[0]);
  } else {
     // fallback: find the pieces
     const part1 = log.match(/NEW_XUDT_TX_HASH=(0x[0-9a-f]+)/i);
     const part2 = log.match(/([0-9a-f]{40})/i);
     if (part1 && part2) {
         console.log("JOINED_HASH=" + part1[1] + part2[1]);
     }
  }
}
main();
