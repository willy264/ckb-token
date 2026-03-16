import { CellInput, CellOutput } from "./cell";
import { Script } from "./script";

/** A cell dependency required by the transaction. */
export interface CellDep {
  outPoint: {
    txHash: string;
    index: string;
  };
  depType: "code" | "depGroup";
}

/** A raw (unsigned) CKB transaction. */
export interface RawTransaction {
  version: string;
  cellDeps: CellDep[];
  headerDeps: string[];
  inputs: CellInput[];
  outputs: CellOutput[];
  outputsData: string[];
}

/** A signed CKB transaction ready for submission. */
export interface SignedTransaction extends RawTransaction {
  witnesses: string[];
}

/** Transaction status returned by RPC. */
export interface TransactionStatus {
  transaction: SignedTransaction;
  txStatus: {
    status: "pending" | "proposed" | "committed";
    blockHash: string | null;
  };
}

/** Helper to create a default raw transaction structure. */
export function createRawTransaction(
  inputs: CellInput[],
  outputs: CellOutput[],
  outputsData: string[],
  cellDeps: CellDep[],
): RawTransaction {
  return {
    version: "0x0",
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
  };
}
