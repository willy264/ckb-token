/**
 * Wallet and signing utilities for CKB transactions.
 * Uses @ckb-lumos/lumos for key management and transaction signing.
 */

import { hd, config, helpers, HexString } from "@ckb-lumos/lumos";

/**
 * Derive a CKB address from a private key.
 *
 * @param privateKey - 32-byte hex string with 0x prefix.
 * @param isMainnet - Whether to generate a mainnet address.
 * @returns CKB address string.
 */
export function privateKeyToAddress(
  privateKey: string,
  isMainnet: boolean = false,
): string {
  const pubKey = hd.key.privateToPublic(privateKey);
  const args = hd.key.publicKeyToBlake160(pubKey);

  const networkConfig = isMainnet
    ? config.predefined.LINA
    : config.predefined.AGGRON4;

  const template = networkConfig.SCRIPTS["SECP256K1_BLAKE160"]!;
  const lockScript = {
    codeHash: template.CODE_HASH,
    hashType: template.HASH_TYPE,
    args: args,
  };

  return helpers.encodeToAddress(lockScript, { config: networkConfig });
}

/**
 * Get the lock script for a private key using secp256k1_blake160.
 *
 * @param privateKey - 32-byte hex string with 0x prefix.
 * @param isMainnet - Whether to use mainnet config.
 * @returns Lock script object.
 */
export function privateKeyToLockScript(
  privateKey: string,
  isMainnet: boolean = false,
): { codeHash: string; hashType: "type" | "data"; args: string } {
  const pubKey = hd.key.privateToPublic(privateKey);
  const args = hd.key.publicKeyToBlake160(pubKey);

  const networkConfig = isMainnet
    ? config.predefined.LINA
    : config.predefined.AGGRON4;
  const template = networkConfig.SCRIPTS["SECP256K1_BLAKE160"]!;

  return {
    codeHash: template.CODE_HASH,
    hashType: template.HASH_TYPE,
    args: args,
  };
}

/**
 * Sign a CKB transaction using a private key.
 * Uses the secp256k1_blake160 signing algorithm.
 *
 * @param txSkeleton - The transaction skeleton to sign.
 * @param privateKey - 32-byte hex string with 0x prefix.
 * @returns Signed transaction ready for submission.
 */
export function signTransaction(
  txSkeleton: helpers.TransactionSkeletonType,
  privateKey: string,
): any {
  const signedTx: any = helpers.sealTransaction(txSkeleton, [
    signMessage(privateKey, txSkeleton),
  ]);
  return signedTx;
}

/**
 * Sign a message (transaction hash) with a private key.
 *
 * @param privateKey - 32-byte hex string with 0x prefix.
 * @param txSkeleton - Transaction skeleton to extract signing message from.
 * @returns Signature hex string.
 */
function signMessage(
  privateKey: string,
  txSkeleton: helpers.TransactionSkeletonType,
): HexString {
  const signingEntries = txSkeleton.get("signingEntries").toArray();
  if (signingEntries.length === 0) {
    throw new Error("No signing entries found in transaction skeleton");
  }
  const message = signingEntries[0].message;
  return hd.key.signRecoverable(message, privateKey);
}

/**
 * Validate that a string is a valid hex-encoded private key.
 *
 * @param key - The key string to validate.
 * @returns True if valid.
 */
export function isValidPrivateKey(key: string): boolean {
  if (!key.startsWith("0x")) return false;
  const hex = key.slice(2);
  if (hex.length !== 64) return false;
  return /^[0-9a-fA-F]+$/.test(hex);
}
