/**
 * MCP Tool: get_token_balance
 * Queries the token balance of an address.
 */

import { CkbClient } from "../client";
import { decodeUint128Hex } from "../utils/codec";
import { addressToScript, computeScriptHash } from "../utils/hash";
import { Script } from "../types/script";

export interface GetTokenBalanceParams {
  address: string;
  typeScriptHash: string;
}

export interface GetTokenBalanceResult {
  address: string;
  balance: string;
  cellCount: number;
}

/**
 * Get the xUDT token balance for an address.
 *
 * This function:
 * 1. Queries the CKB indexer for all live cells matching the address lock and token type script
 * 2. Sums up all Uint128 LE values from cell data fields
 * 3. Returns the total balance as a decimal string
 *
 * @param client - CKB client instance.
 * @param params - Balance query parameters.
 * @param xudtCodeHash - Code hash of the deployed xUDT type script.
 * @param xudtHashType - Hash type for the xUDT code hash.
 * @param ownerLockHash - Owner lock hash in the xUDT args.
 * @returns Balance details.
 */
export async function getTokenBalance(
  client: CkbClient,
  params: GetTokenBalanceParams,
  xudtCodeHash: string,
  xudtHashType: "type" | "data" | "data1" = "data1",
  ownerLockHash: string,
): Promise<GetTokenBalanceResult> {
  const { address } = params;

  // Get the address's lock script
  const lockScript = addressToScript(address);

  // Build the xUDT type script
  const typeScript: Script = {
    codeHash: xudtCodeHash,
    hashType: xudtHashType,
    args: ownerLockHash,
  };

  // Collect all UDT cells for this address
  const cells = await client.collectCells(lockScript, typeScript, 1000);

  // Sum all token amounts
  let totalBalance = 0n;
  let cellCount = 0;

  for (const cell of cells) {
    if (!cell.outputData || cell.outputData === "0x" || cell.outputData.length < 34) {
      continue;
    }

    try {
      const amount = decodeUint128Hex(cell.outputData);
      totalBalance += amount;
      cellCount++;
    } catch {
      // Skip cells with invalid UDT data
      continue;
    }
  }

  return {
    address,
    balance: totalBalance.toString(),
    cellCount,
  };
}
