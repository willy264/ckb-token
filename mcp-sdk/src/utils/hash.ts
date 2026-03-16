/**
 * Script hash utilities for CKB.
 * CKB uses blake2b-256 with a custom personalization for hashing.
 */

import { helpers, utils, Script as LumosScript } from "@ckb-lumos/lumos";
import { Script } from "../types/script";

/**
 * Compute the script hash (blake2b-256) of a CKB script.
 * This is used to derive the owner lock hash for xUDT args.
 *
 * @param script - The script to hash.
 * @returns 32-byte hex string with 0x prefix.
 */
export function computeScriptHash(script: Script): string {
  const lumosScript: LumosScript = {
    codeHash: script.codeHash,
    hashType: script.hashType,
    args: script.args,
  };
  return utils.computeScriptHash(lumosScript);
}

/**
 * Compute blake2b-256 hash of arbitrary data.
 * Uses CKB's personalization: "ckb-default-hash".
 *
 * @param data - Hex string with 0x prefix.
 * @returns 32-byte hex string with 0x prefix.
 */
export function blake2b256(data: string): string {
  const hasher = new utils.CKBHasher();
  hasher.update(data);
  return hasher.digestHex();
}

/**
 * Convert a CKB address to its lock script.
 *
 * @param address - CKB address (full format).
 * @returns The lock script.
 */
export function addressToScript(address: string): Script {
  const lumosScript = helpers.parseAddress(address);
  return {
    codeHash: lumosScript.codeHash,
    hashType: lumosScript.hashType,
    args: lumosScript.args,
  };
}

/**
 * Convert a lock script to a CKB address.
 *
 * @param script - The lock script.
 * @param isMainnet - Whether to use mainnet prefix (default: false for testnet).
 * @returns CKB address string.
 */
export function scriptToAddress(
  script: Script,
  isMainnet: boolean = false,
): string {
  const lumosScript: LumosScript = {
    codeHash: script.codeHash,
    hashType: script.hashType,
    args: script.args,
  };
  const prefix = isMainnet ? "ckb" : "ckt";
  return helpers.encodeToAddress(lumosScript, {
    config: { PREFIX: prefix } as any,
  });
}
