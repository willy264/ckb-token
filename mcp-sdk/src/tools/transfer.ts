/**
 * MCP Tool: transfer_token
 * Transfers xUDT tokens between addresses.
 */

import { helpers, commons, config, hd } from "@ckb-lumos/lumos";
import { CkbClient } from "../client";
import { encodeUint128Hex, decodeUint128Hex } from "../utils/codec";
import { computeScriptHash, addressToScript } from "../utils/hash";
import { shannonsToHex, calculateUdtCellCapacity } from "../utils/capacity";
import { Script } from "../types/script";

export interface TransferTokenParams {
  fromAddress: string;
  toAddress: string;
  amount: string;
  privateKey: string;
}

export interface TransferTokenResult {
  txHash: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
}

/**
 * Transfer xUDT tokens from one address to another.
 *
 * This function:
 * 1. Collects enough input UDT cells to cover the transfer amount
 * 2. Creates output cells for the recipient and change back to sender
 * 3. Validates that input amount equals output amount
 * 4. Signs and sends the transaction
 *
 * @param client - CKB client instance.
 * @param params - Transfer parameters.
 * @param xudtCodeHash - Code hash of the deployed xUDT type script.
 * @param xudtHashType - Hash type for the xUDT code hash.
 * @param ownerLockHash - Owner lock hash in the xUDT args.
 * @returns Transaction hash and transfer details.
 */
export async function transferToken(
  client: CkbClient,
  params: TransferTokenParams,
  xudtCodeHash: string,
  xudtHashType: "type" | "data" | "data1" = "data1",
  ownerLockHash: string,
): Promise<TransferTokenResult> {
  const { fromAddress, toAddress, amount, privateKey } = params;
  const transferAmount = BigInt(amount);

  if (transferAmount <= 0n) {
    throw new Error("Transfer amount must be positive");
  }

  // Build the xUDT type script
  const xudtTypeScript: Script = {
    codeHash: xudtCodeHash,
    hashType: xudtHashType,
    args: ownerLockHash,
  };

  // Get the sender's lock script
  const senderLock = addressToScript(fromAddress);
  const recipientLock = addressToScript(toAddress);

  // Collect UDT cells from the sender
  const udtCells = await client.collectCells(senderLock, xudtTypeScript, 100);

  if (udtCells.length === 0) {
    throw new Error(`No UDT cells found for address ${fromAddress}`);
  }

  // Sum up available UDT amounts
  let totalInputAmount = 0n;
  const selectedCells = [];
  for (const cell of udtCells) {
    if (!cell.outputData || cell.outputData === "0x") continue;
    const cellAmount = decodeUint128Hex(cell.outputData);
    totalInputAmount += cellAmount;
    selectedCells.push(cell);
    if (totalInputAmount >= transferAmount) break;
  }

  if (totalInputAmount < transferAmount) {
    throw new Error(
      `Insufficient UDT balance: need ${transferAmount}, have ${totalInputAmount}`,
    );
  }

  const changeAmount = totalInputAmount - transferAmount;
  const udtCellCapacity = calculateUdtCellCapacity();

  // Build the transaction skeleton
  let txSkeleton = helpers.TransactionSkeleton({});

  // Add UDT inputs
  for (const cell of selectedCells) {
    txSkeleton = txSkeleton.update("inputs", (inputs: any) =>
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: "0x0",
        cellOutput: {
          capacity: cell.output.capacity,
          lock: {
            codeHash: cell.output.lock.codeHash,
            hashType: cell.output.lock.hashType,
            args: cell.output.lock.args,
          },
          type: {
            codeHash: xudtTypeScript.codeHash,
            hashType: xudtTypeScript.hashType,
            args: xudtTypeScript.args,
          },
        },
        data: cell.outputData,
      }),
    );
  }

  // Add recipient UDT output
  txSkeleton = txSkeleton.update("outputs", (outputs: any) =>
    outputs.push({
      cellOutput: {
        capacity: shannonsToHex(udtCellCapacity),
        lock: {
          codeHash: recipientLock.codeHash,
          hashType: recipientLock.hashType,
          args: recipientLock.args,
        },
        type: {
          codeHash: xudtTypeScript.codeHash,
          hashType: xudtTypeScript.hashType,
          args: xudtTypeScript.args,
        },
      },
      data: encodeUint128Hex(transferAmount),
    }),
  );

  // Add change UDT output if there's a remainder
  if (changeAmount > 0n) {
    txSkeleton = txSkeleton.update("outputs", (outputs: any) =>
      outputs.push({
        cellOutput: {
          capacity: shannonsToHex(udtCellCapacity),
          lock: {
            codeHash: senderLock.codeHash,
            hashType: senderLock.hashType,
            args: senderLock.args,
          },
          type: {
            codeHash: xudtTypeScript.codeHash,
            hashType: xudtTypeScript.hashType,
            args: xudtTypeScript.args,
          },
        },
        data: encodeUint128Hex(changeAmount),
      }),
    );
  }

  // Inject CKB capacity for the outputs
  const senderAddress = fromAddress;
  const totalOutputCapacity = udtCellCapacity * (changeAmount > 0n ? 2n : 1n);

  // Calculate how much capacity we already have from UDT inputs
  let inputCapacity = 0n;
  for (const cell of selectedCells) {
    inputCapacity += BigInt(cell.output.capacity);
  }

  if (inputCapacity < totalOutputCapacity) {
    // Need additional capacity cells
    txSkeleton = await commons.common.injectCapacity(
      txSkeleton,
      [senderAddress],
      totalOutputCapacity - inputCapacity,
    );
  }

  // Pay transaction fee
  txSkeleton = await commons.common.payFeeByFeeRate(
    txSkeleton,
    [senderAddress],
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
    amount,
    fromAddress,
    toAddress,
  };
}
