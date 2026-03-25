import * as fs from "fs";
import * as path from "path";
import { utils } from "@ckb-lumos/lumos";

const XUDT_BIN_PATH = path.resolve(__dirname, "../target/riscv64imac-unknown-none-elf/release/xudt-type-script");
const OWNER_LOCK_BIN_PATH = path.resolve(__dirname, "../target/riscv64imac-unknown-none-elf/release/owner-lock-script");

function getCodeHash(filePath: string) {
  const binaryData = fs.readFileSync(filePath);
  return utils.ckbHash(binaryData);
}

console.log("XUDT_CODE_HASH=" + getCodeHash(XUDT_BIN_PATH));
console.log("OWNER_LOCK_CODE_HASH=" + getCodeHash(OWNER_LOCK_BIN_PATH));
