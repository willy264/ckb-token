import { Script } from "./script";

/** Reference to a specific cell by transaction hash and index. */
export interface OutPoint {
  /** Transaction hash (hex string with 0x prefix, 32 bytes). */
  txHash: string;
  /** Index of the cell output in the transaction. */
  index: string;
}

/** A cell input referencing a previous cell to consume. */
export interface CellInput {
  /** The previous cell's out point. */
  previousOutput: OutPoint;
  /** Since value for time-based or epoch-based locks (usually "0x0"). */
  since: string;
}

/** A cell output describing a new cell to create. */
export interface CellOutput {
  /** Capacity in Shannons (hex string with 0x prefix). 1 CKB = 10^8 Shannons. */
  capacity: string;
  /** The lock script controlling ownership. */
  lock: Script;
  /** Optional type script for validation logic (e.g., xUDT). */
  type?: Script | null;
}

/** A live cell returned from the indexer with full details. */
export interface LiveCell {
  /** Cell output metadata. */
  cellOutput: CellOutput;
  /** Cell data (hex string with 0x prefix). */
  data: string;
  /** Out point referencing this cell. */
  outPoint: OutPoint;
  /** Block number when this cell was created (hex string). */
  blockNumber: string;
}

/** The result from indexer get_cells query. */
export interface GetCellsResult {
  /** Array of live cell objects. */
  objects: IndexerCell[];
  /** Cursor for pagination. */
  lastCursor: string;
}

/** Cell object as returned by the CKB indexer. */
export interface IndexerCell {
  blockNumber: string;
  outPoint: OutPoint;
  output: CellOutput;
  outputData: string;
  txIndex: string;
}
