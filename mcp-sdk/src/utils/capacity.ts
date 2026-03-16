/**
 * CKByte capacity calculation utilities.
 * 1 CKB = 10^8 Shannons. Capacity values are in Shannons.
 */

const SHANNONS_PER_CKB = 100_000_000n;

/** Minimum cell capacity: 61 CKBytes (for a basic cell with lock script). */
const MIN_CELL_CAPACITY = 61n * SHANNONS_PER_CKB;

/** Additional capacity needed for 16 bytes of UDT data in the cell. */
const UDT_DATA_CAPACITY = 16n * SHANNONS_PER_CKB / 100_000_000n * 100_000_000n;

/**
 * Calculate the minimum capacity required for a UDT cell.
 * A UDT cell needs capacity for:
 * - 8 bytes: capacity field itself
 * - 32 + 1 + variable: lock script (code_hash + hash_type + args)
 * - 32 + 1 + variable: type script (code_hash + hash_type + args)
 * - 16 bytes: UDT data (Uint128)
 *
 * Rough estimate: ~142 CKBytes for a typical UDT cell.
 *
 * @param lockArgsLength - Length of lock script args in bytes (default 20 for secp256k1).
 * @param typeArgsLength - Length of type script args in bytes (default 32 for xUDT).
 * @returns Minimum capacity in Shannons as bigint.
 */
export function calculateUdtCellCapacity(
  lockArgsLength: number = 20,
  typeArgsLength: number = 32,
): bigint {
  // Capacity field: 8 bytes
  // Lock script: 32 (code_hash) + 1 (hash_type) + lockArgsLength
  // Type script: 32 (code_hash) + 1 (hash_type) + typeArgsLength
  // Data: 16 bytes (Uint128)
  const totalBytes = 8 + (32 + 1 + lockArgsLength) + (32 + 1 + typeArgsLength) + 16;
  return BigInt(totalBytes) * SHANNONS_PER_CKB;
}

/**
 * Calculate minimum capacity for a plain cell (no type script, no data).
 * @param lockArgsLength - Length of lock script args in bytes.
 * @returns Minimum capacity in Shannons.
 */
export function calculatePlainCellCapacity(lockArgsLength: number = 20): bigint {
  const totalBytes = 8 + (32 + 1 + lockArgsLength);
  return BigInt(totalBytes) * SHANNONS_PER_CKB;
}

/**
 * Convert CKB amount to Shannons.
 * @param ckb - Amount in CKB (as number or string).
 * @returns Amount in Shannons as bigint.
 */
export function ckbToShannons(ckb: number | string): bigint {
  const amount = typeof ckb === "string" ? parseFloat(ckb) : ckb;
  return BigInt(Math.floor(amount * 100_000_000));
}

/**
 * Convert Shannons to CKB (as string with 8 decimal places).
 * @param shannons - Amount in Shannons.
 * @returns Amount in CKB as string.
 */
export function shannonsToCkb(shannons: bigint): string {
  const whole = shannons / SHANNONS_PER_CKB;
  const frac = shannons % SHANNONS_PER_CKB;
  const fracStr = frac.toString().padStart(8, "0");
  return `${whole}.${fracStr}`;
}

/**
 * Convert a hex capacity string to bigint Shannons.
 * @param hex - Capacity hex string with 0x prefix.
 * @returns Shannons as bigint.
 */
export function hexToShannons(hex: string): bigint {
  return BigInt(hex);
}

/**
 * Convert Shannons to hex capacity string.
 * @param shannons - Amount in Shannons.
 * @returns Hex string with 0x prefix.
 */
export function shannonsToHex(shannons: bigint): string {
  return "0x" + shannons.toString(16);
}

export {
  SHANNONS_PER_CKB,
  MIN_CELL_CAPACITY,
  UDT_DATA_CAPACITY,
};
