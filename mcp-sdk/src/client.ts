/**
 * CKB RPC client wrapper.
 * Provides methods to interact with the CKB node and indexer.
 */

import { RPC, Indexer, config, helpers } from "@ckb-lumos/lumos";
import { IndexerCell, GetCellsResult } from "./types/cell";
import { Script } from "./types/script";

export interface CkbClientConfig {
  rpcUrl: string;
  indexerUrl: string;
  isMainnet?: boolean;
}

export class CkbClient {
  private rpc: RPC;
  private indexer: Indexer;
  private isMainnet: boolean;

  constructor(cfg: CkbClientConfig) {
    this.rpc = new RPC(cfg.rpcUrl);
    this.indexer = new Indexer(cfg.indexerUrl, cfg.rpcUrl);
    this.isMainnet = cfg.isMainnet ?? false;

    // Initialize Lumos config
    const networkConfig = this.isMainnet
      ? config.predefined.LINA
      : config.predefined.AGGRON4;
    config.initializeConfig(networkConfig);
  }

  /** Get the underlying RPC instance. */
  getRpc(): RPC {
    return this.rpc;
  }

  /** Get the underlying Indexer instance. */
  getIndexer(): Indexer {
    return this.indexer;
  }

  /** Get the current tip block number. */
  async getTipBlockNumber(): Promise<string> {
    const header = await this.rpc.getTipHeader();
    return header.number;
  }

  /**
   * Collect live cells matching a lock script and optional type script.
   *
   * @param lockScript - The lock script to match.
   * @param typeScript - Optional type script to filter by.
   * @param limit - Maximum number of cells to return.
   * @returns Array of matching live cells.
   */
  async collectCells(
    lockScript: Script,
    typeScript?: Script | null,
    limit: number = 20,
  ): Promise<IndexerCell[]> {
    const searchKey: any = {
      script: {
        code_hash: lockScript.codeHash,
        hash_type: lockScript.hashType,
        args: lockScript.args,
      },
      script_type: "lock",
    };

    if (typeScript) {
      searchKey.filter = {
        script: {
          code_hash: typeScript.codeHash,
          hash_type: typeScript.hashType,
          args: typeScript.args,
        },
      };
    }

    const result = await this.rpc.call("get_cells", [
      searchKey,
      "asc",
      `0x${limit.toString(16)}`,
    ]);

    return (result.objects || []).map((cell: any) => ({
      blockNumber: cell.block_number,
      outPoint: {
        txHash: cell.out_point.tx_hash,
        index: cell.out_point.index,
      },
      output: {
        capacity: cell.output.capacity,
        lock: {
          codeHash: cell.output.lock.code_hash,
          hashType: cell.output.lock.hash_type,
          args: cell.output.lock.args,
        },
        type: cell.output.type
          ? {
              codeHash: cell.output.type.code_hash,
              hashType: cell.output.type.hash_type,
              args: cell.output.type.args,
            }
          : null,
      },
      outputData: cell.output_data,
      txIndex: cell.tx_index,
    }));
  }

  /**
   * Collect live cells with enough capacity.
   *
   * @param lockScript - Lock script of the cells to collect.
   * @param requiredCapacity - Minimum total capacity needed (in Shannons).
   * @returns Array of cells whose total capacity >= requiredCapacity.
   */
  async collectCapacityCells(
    lockScript: Script,
    requiredCapacity: bigint,
  ): Promise<IndexerCell[]> {
    const cells: IndexerCell[] = [];
    let totalCapacity = 0n;
    let cursor: string | undefined;

    while (totalCapacity < requiredCapacity) {
      const searchKey: any = {
        script: {
          code_hash: lockScript.codeHash,
          hash_type: lockScript.hashType,
          args: lockScript.args,
        },
        script_type: "lock",
        filter: {
          script_len_range: ["0x0", "0x1"], // Only cells without type script
        },
      };

      const params: any[] = [searchKey, "asc", "0x14"];
      if (cursor) {
        params.push(cursor);
      }

      const result = await this.rpc.call("get_cells", params);

      if (!result.objects || result.objects.length === 0) break;

      for (const cell of result.objects) {
        // Skip cells with type scripts (they might be UDT cells)
        if (cell.output.type) continue;

        cells.push({
          blockNumber: cell.block_number,
          outPoint: {
            txHash: cell.out_point.tx_hash,
            index: cell.out_point.index,
          },
          output: {
            capacity: cell.output.capacity,
            lock: {
              codeHash: cell.output.lock.code_hash,
              hashType: cell.output.lock.hash_type,
              args: cell.output.lock.args,
            },
          },
          outputData: cell.output_data,
          txIndex: cell.tx_index,
        });

        totalCapacity += BigInt(cell.output.capacity);
        if (totalCapacity >= requiredCapacity) break;
      }

      cursor = result.last_cursor;
      if (!cursor) break;
    }

    if (totalCapacity < requiredCapacity) {
      throw new Error(
        `Insufficient capacity: need ${requiredCapacity} Shannons, ` +
          `got ${totalCapacity} Shannons`,
      );
    }

    return cells;
  }

  /**
   * Collect UDT cells for a given address and type script.
   *
   * @param lockScript - Lock script of the address.
   * @param typeScript - The xUDT type script.
   * @param requiredAmount - Minimum token amount needed.
   * @returns Array of UDT cells.
   */
  async collectUdtCells(
    lockScript: Script,
    typeScript: Script,
    requiredAmount: bigint,
  ): Promise<IndexerCell[]> {
    const cells = await this.collectCells(lockScript, typeScript, 100);
    return cells;
  }

  /**
   * Send a signed transaction to the network.
   *
   * @param tx - The signed transaction.
   * @returns Transaction hash.
   */
  async sendTransaction(tx: any): Promise<string> {
    return await this.rpc.sendTransaction(tx, "passthrough");
  }

  /**
   * Get transaction status by hash.
   *
   * @param txHash - Transaction hash.
   * @returns Transaction with status.
   */
  async getTransaction(txHash: string): Promise<any> {
    return await this.rpc.getTransaction(txHash);
  }

  /**
   * Wait for a transaction to be committed.
   *
   * @param txHash - Transaction hash to wait for.
   * @param timeoutMs - Maximum wait time in milliseconds.
   * @returns The transaction status.
   */
  async waitForTransaction(txHash: string, timeoutMs: number = 60000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getTransaction(txHash);
      if (result?.txStatus?.status === "committed") {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error(`Transaction ${txHash} not committed within ${timeoutMs}ms`);
  }

  /**
   * Deploy a binary to the chain by creating a cell with the binary as data.
   *
   * @param binary - The binary data to deploy (hex string with 0x prefix).
   * @param fromLockScript - Lock script of the deployer.
   * @param privateKey - Private key for signing.
   * @returns Transaction hash and out point of the deployed cell.
   */
  async deployBinary(
    binary: string,
    fromLockScript: Script,
    privateKey: string,
  ): Promise<{ txHash: string; index: string }> {
    const { helpers: lumosHelpers, commons } = await import("@ckb-lumos/lumos");

    // Calculate capacity needed for the deployed binary
    const binaryBytes = (binary.length - 2) / 2; // Remove 0x prefix
    const capacity = BigInt(binaryBytes + 61) * 100_000_000n; // bytes + min cell

    let txSkeleton = lumosHelpers.TransactionSkeleton({});

    const lumosLockScript = {
      codeHash: fromLockScript.codeHash,
      hashType: fromLockScript.hashType as any,
      args: fromLockScript.args,
    };

    // Add output for the deployed binary
    txSkeleton = txSkeleton.update("outputs", (outputs: any) =>
      outputs.push({
        cellOutput: {
          capacity: "0x" + capacity.toString(16),
          lock: lumosLockScript,
        },
        data: binary,
      }),
    );

    // Add capacity inputs
    txSkeleton = await commons.common.injectCapacity(
      txSkeleton,
      [lumosHelpers.encodeToAddress(lumosLockScript)],
      capacity,
    );

    // Add fee
    txSkeleton = await commons.common.payFeeByFeeRate(
      txSkeleton,
      [lumosHelpers.encodeToAddress(lumosLockScript)],
      1000,
    );

    // Sign and send
    txSkeleton = commons.common.prepareSigningEntries(txSkeleton);
    const { hd } = await import("@ckb-lumos/lumos");
    const signingEntries = txSkeleton.get("signingEntries").toArray();
    const signatures = signingEntries.map((entry: any) =>
      hd.key.signRecoverable(entry.message, privateKey),
    );
    const signedTx = lumosHelpers.sealTransaction(txSkeleton, signatures);
    const tx = lumosHelpers.createTransactionFromSkeleton(signedTx);

    const txHash = await this.sendTransaction(tx);
    return { txHash, index: "0x0" };
  }
}
