/**
 * MCP Tool: burn_token
 * Burns xUDT tokens to reduce the total supply.
 */

import { helpers, commons, hd } from "@ckb-lumos/lumos";
import { CkbClient } from "../client";
import { encodeUint128Hex, decodeUint128Hex } from "../utils/codec";
import { addressToScript } from "../utils/hash";
import { shannonsToHex, calculateUdtCellCapacity } from "../utils/capacity";
import { Script } from "../types/script";

export interface BurnTokenParams {
  fromAddress: string;
  amount: string;
  privateKey: string;
}

export interface BurnTokenResult {
  txHash: string;
  burnedAmount: string;
  fromAddress: string;
}

/**
 * Burn xUDT tokens by consuming UDT cells and creating outputs with less total amount.
 *
 * @param client - CKB client instance.
 * @param params - Burn parameters.
 * @param xudtCodeHash - Code hash of the deployed xUDT type script.
 * @param xudtHashType - Hash type for the xUDT code hash.
 * @param ownerLockHash - Owner lock hash in the xUDT args.
 * @returns Transaction hash and burn details.
 */
export async function burnToken(
  client: CkbClient,
  params: BurnTokenParams,
  xudtCodeHash: string,
  xudtHashType: "type" | "data" | "data1" = "data1",
  ownerLockHash: string,
): Promise<BurnTokenResult> {
  const { fromAddress, amount, privateKey } = params;
  const burnAmount = BigInt(amount);

  if (burnAmount <= 0n) {
    throw new Error("Burn amount must be positive");
  }

  // Build the xUDT type script
  const xudtTypeScript: Script = {
    codeHash: xudtCodeHash,
    hashType: xudtHashType,
    args: ownerLockHash,
  };

  // Get the burner's lock script
  const burnerLock = addressToScript(fromAddress);

  // Collect UDT cells from the burner
  const udtCells = await client.collectCells(burnerLock, xudtTypeScript, 100);

  if (udtCells.length === 0) {
    throw new Error(`No UDT cells found for address ${fromAddress}`);
  }

  // Sum up available UDT amounts and select cells
  let totalInputAmount = 0n;
  const selectedCells = [];
  for (const cell of udtCells) {
    if (!cell.outputData || cell.outputData === "0x") continue;
    const cellAmount = decodeUint128Hex(cell.outputData);
    totalInputAmount += cellAmount;
    selectedCells.push(cell);
    if (totalInputAmount >= burnAmount) break;
  }

  if (totalInputAmount < burnAmount) {
    throw new Error(
      `Insufficient UDT balance for burn: need ${burnAmount}, have ${totalInputAmount}`,
    );
  }

  const remainingAmount = totalInputAmount - burnAmount;
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

  // Only add a UDT change output if there's remaining balance
  if (remainingAmount > 0n) {
    txSkeleton = txSkeleton.update("outputs", (outputs: any) =>
      outputs.push({
        cellOutput: {
          capacity: shannonsToHex(udtCellCapacity),
          lock: {
            codeHash: burnerLock.codeHash,
            hashType: burnerLock.hashType,
            args: burnerLock.args,
          },
          type: {
            codeHash: xudtTypeScript.codeHash,
            hashType: xudtTypeScript.hashType,
            args: xudtTypeScript.args,
          },
        },
        data: encodeUint128Hex(remainingAmount),
      }),
    );
  }

  // Pay transaction fee (reclaim capacity from burned UDT cells)
  txSkeleton = await commons.common.payFeeByFeeRate(
    txSkeleton,
    [fromAddress],
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
    burnedAmount: amount,
    fromAddress,
  };
}
