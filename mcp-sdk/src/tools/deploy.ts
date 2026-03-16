/**
 * MCP Tool: deploy_contract
 * Deploys a compiled contract binary to the CKB chain.
 */

import * as fs from "fs";
import { helpers, commons, hd } from "@ckb-lumos/lumos";
import { CkbClient } from "../client";
import { addressToScript } from "../utils/hash";
import { shannonsToHex, calculatePlainCellCapacity } from "../utils/capacity";

export interface DeployContractParams {
  binaryPath: string;
  privateKey: string;
}

export interface DeployContractResult {
  txHash: string;
  index: string;
  dataHash: string;
}

/**
 * Deploy a compiled RISC-V binary to the CKB chain.
 *
 * The binary is stored in a cell's data field. The resulting out_point
 * (txHash + index) can then be used as a cell_dep in transactions that
 * reference this script.
 *
 * @param client - CKB client instance.
 * @param params - Deploy parameters.
 * @returns Transaction hash, index, and data hash of the deployed binary.
 */
export async function deployContract(
  client: CkbClient,
  params: DeployContractParams,
): Promise<DeployContractResult> {
  const { binaryPath, privateKey } = params;

  // Read the binary file
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Binary file not found: ${binaryPath}`);
  }

  const binaryData = fs.readFileSync(binaryPath);
  const binaryHex =
    "0x" +
    Array.from(binaryData)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  // Derive the deployer's lock script
  const pubKey = hd.key.privateToPublic(privateKey);
  const args = hd.key.publicKeyToBlake160(pubKey);

  const { config } = await import("@ckb-lumos/lumos");
  const networkConfig = config.getConfig();
  const secp256k1Template = networkConfig.SCRIPTS["SECP256K1_BLAKE160"]!;
  const deployerLockScript = {
    codeHash: secp256k1Template.CODE_HASH,
    hashType: secp256k1Template.HASH_TYPE,
    args: args,
  };

  // Calculate capacity needed: binary size + cell overhead
  const binarySize = BigInt(binaryData.length);
  const cellOverhead = 61n * 100_000_000n; // 61 CKBytes for cell structure
  const dataCapacity = binarySize * 100_000_000n; // 1 CKByte per byte of data
  const totalCapacity = cellOverhead + dataCapacity;

  // Build the transaction skeleton
  let txSkeleton = helpers.TransactionSkeleton({});

  // Add the output cell containing the binary
  txSkeleton = txSkeleton.update("outputs", (outputs: any) =>
    outputs.push({
      cellOutput: {
        capacity: shannonsToHex(totalCapacity),
        lock: deployerLockScript,
      },
      data: binaryHex,
    }),
  );

  // Add capacity inputs from the deployer
  const deployerAddress = helpers.encodeToAddress(deployerLockScript);

  txSkeleton = await commons.common.injectCapacity(
    txSkeleton,
    [deployerAddress],
    totalCapacity,
  );

  // Pay transaction fee
  txSkeleton = await commons.common.payFeeByFeeRate(
    txSkeleton,
    [deployerAddress],
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

  // Compute data hash for reference
  const { utils } = await import("@ckb-lumos/lumos");
  const hasher = new utils.CKBHasher();
  hasher.update(binaryHex);
  const dataHash = hasher.digestHex();

  return {
    txHash,
    index: "0x0",
    dataHash,
  };
}
