/**
 * MCP Tool: mint_token
 * Mints new xUDT tokens to a specified address.
 */

import { helpers, commons, config, hd } from "@ckb-lumos/lumos";
import { CkbClient } from "../client";
import { encodeUint128Hex } from "../utils/codec";
import { computeScriptHash, addressToScript } from "../utils/hash";
import { shannonsToHex, calculateUdtCellCapacity } from "../utils/capacity";

export interface MintTokenParams {
  toAddress: string;
  amount: string;
  privateKey: string;
}

export interface MintTokenResult {
  txHash: string;
  amount: string;
  toAddress: string;
}

/**
 * Mint new xUDT tokens.
 *
 * This function:
 * 1. Finds a live cell owned by the issuer to use as input
 * 2. Builds a transaction with a new output cell containing the minted amount
 * 3. Sets the output cell's Type Script to the xUDT Type Script
 * 4. Signs and sends the transaction
 *
 * @param client - CKB client instance.
 * @param params - Mint parameters.
 * @param xudtCodeHash - Code hash of the deployed xUDT type script.
 * @param xudtHashType - Hash type for the xUDT code hash.
 * @returns Transaction hash and mint details.
 */
export async function mintToken(
  client: CkbClient,
  params: MintTokenParams,
  xudtCodeHash: string,
  xudtHashType: "type" | "data" | "data1" = "data1",
): Promise<MintTokenResult> {
  const { toAddress, amount, privateKey } = params;
  const mintAmount = BigInt(amount);

  if (mintAmount <= 0n) {
    throw new Error("Mint amount must be positive");
  }

  // Derive the owner's lock script from the private key
  const pubKey = hd.key.privateToPublic(privateKey);
  const args = hd.key.publicKeyToBlake160(pubKey);

  const networkConfig = config.getConfig();
  const secp256k1Template = networkConfig.SCRIPTS["SECP256K1_BLAKE160"]!;
  const ownerLockScript = {
    codeHash: secp256k1Template.CODE_HASH,
    hashType: secp256k1Template.HASH_TYPE,
    args: args,
  };

  // Compute the owner lock hash for the xUDT type script args
  const ownerLockHash = computeScriptHash({
    codeHash: ownerLockScript.codeHash,
    hashType: ownerLockScript.hashType,
    args: ownerLockScript.args,
  });

  // Build the xUDT type script
  const xudtTypeScript = {
    codeHash: xudtCodeHash,
    hashType: xudtHashType,
    args: ownerLockHash,
  };

  // Encode the mint amount as Uint128 LE hex
  const udtData = encodeUint128Hex(mintAmount);

  // Calculate capacity needed for the UDT cell
  const udtCellCapacity = calculateUdtCellCapacity();

  // Parse the recipient's lock script
  const recipientLock = addressToScript(toAddress);

  // Build the transaction skeleton
  let txSkeleton = helpers.TransactionSkeleton({});

  // Add the UDT output cell
  txSkeleton = txSkeleton.update("outputs", (outputs: any) =>
    outputs.push({
      cellOutput: {
        capacity: shannonsToHex(udtCellCapacity),
        lock: {
          codeHash: recipientLock.codeHash,
          hashType: recipientLock.hashType,
          args: recipientLock.args,
        },
        type: xudtTypeScript,
      },
      data: udtData,
    }),
  );

  // The owner's address (for collecting capacity inputs)
  const ownerAddress = helpers.encodeToAddress(ownerLockScript);

  // Inject capacity from the owner's cells
  txSkeleton = await commons.common.injectCapacity(
    txSkeleton,
    [ownerAddress],
    udtCellCapacity,
  );

  // Pay transaction fee
  txSkeleton = await commons.common.payFeeByFeeRate(
    txSkeleton,
    [ownerAddress],
    1000,
  );

  // Prepare signing entries
  txSkeleton = commons.common.prepareSigningEntries(txSkeleton);

  // Sign the transaction
  const signingEntries = txSkeleton.get("signingEntries").toArray();
  const signatures = signingEntries.map((entry: any) =>
    hd.key.signRecoverable(entry.message, privateKey),
  );

  const signedTx = helpers.sealTransaction(txSkeleton, signatures);

  // Send the transaction
  const txHash = await client.sendTransaction(signedTx);

  return {
    txHash,
    amount: amount,
    toAddress,
  };
}
