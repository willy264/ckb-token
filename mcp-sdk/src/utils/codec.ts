/**
 * xUDT amount encoding/decoding utilities.
 * Token amounts are stored as 16-byte little-endian Uint128 in cell data.
 */

/**
 * Encode a bigint amount as a 16-byte little-endian Uint8Array.
 * @param amount - The token amount to encode (must be non-negative and fit in 128 bits).
 * @returns 16-byte Uint8Array in little-endian format.
 */
export function encodeUint128(amount: bigint): Uint8Array {
  if (amount < 0n) {
    throw new Error("Amount must be non-negative");
  }
  if (amount >= 2n ** 128n) {
    throw new Error("Amount exceeds Uint128 max value");
  }

  const buf = new Uint8Array(16);
  let remaining = amount;
  for (let i = 0; i < 16; i++) {
    buf[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return buf;
}

/**
 * Decode a 16-byte little-endian Uint8Array to a bigint.
 * @param bytes - 16-byte Uint8Array in little-endian format.
 * @returns The decoded token amount as bigint.
 */
export function decodeUint128(bytes: Uint8Array): bigint {
  if (bytes.length < 16) {
    throw new Error(`Expected at least 16 bytes, got ${bytes.length}`);
  }

  let result = 0n;
  for (let i = 15; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Encode a bigint amount as a hex string (with 0x prefix) for cell data.
 * @param amount - The token amount to encode.
 * @returns Hex string with 0x prefix representing the 16-byte LE value.
 */
export function encodeUint128Hex(amount: bigint): string {
  const bytes = encodeUint128(amount);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Decode a hex string (with 0x prefix) to a bigint token amount.
 * @param hex - Hex string representing 16-byte LE Uint128.
 * @returns The decoded token amount as bigint.
 */
export function decodeUint128Hex(hex: string): bigint {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length < 32) {
    throw new Error(`Expected at least 32 hex chars (16 bytes), got ${cleanHex.length}`);
  }

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return decodeUint128(bytes);
}
