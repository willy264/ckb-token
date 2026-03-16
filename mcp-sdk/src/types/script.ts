/** CKB Script hash types. */
export type ScriptHashType = "type" | "data" | "data1" | "data2";

/** A CKB Script that defines lock or type logic. */
export interface Script {
  /** The hash of the script code (hex string with 0x prefix, 32 bytes). */
  codeHash: string;
  /** How the codeHash is interpreted. */
  hashType: ScriptHashType;
  /** Script arguments (hex string with 0x prefix). */
  args: string;
}

/** Configuration for an xUDT type script. */
export interface XudtTypeScriptConfig {
  /** Code hash of the deployed xUDT type script binary. */
  codeHash: string;
  /** Hash type for the code hash. */
  hashType: ScriptHashType;
  /** 32-byte owner lock script hash (hex with 0x prefix). */
  ownerLockHash: string;
}

/** Build an xUDT type script from config. */
export function buildXudtTypeScript(config: XudtTypeScriptConfig): Script {
  return {
    codeHash: config.codeHash,
    hashType: config.hashType,
    args: config.ownerLockHash,
  };
}

/** Compare two scripts for equality. */
export function scriptsEqual(a: Script | null | undefined, b: Script | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.codeHash === b.codeHash &&
    a.hashType === b.hashType &&
    a.args === b.args
  );
}
