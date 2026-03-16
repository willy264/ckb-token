/**
 * MCP Server entry point for CKB xUDT token operations.
 * Registers all token tools: mint, transfer, burn, balance, deploy.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { CkbClient } from "./client";
import { mintToken } from "./tools/mint";
import { transferToken } from "./tools/transfer";
import { burnToken } from "./tools/burn";
import { getTokenBalance } from "./tools/balance";
import { deployContract } from "./tools/deploy";

// Load configuration from environment variables
const CKB_RPC_URL = process.env.CKB_RPC_URL || "http://127.0.0.1:8114";
const CKB_INDEXER_URL = process.env.CKB_INDEXER_URL || "http://127.0.0.1:8116";
const XUDT_CODE_HASH = process.env.XUDT_CODE_HASH || "";
const XUDT_HASH_TYPE = (process.env.XUDT_HASH_TYPE || "data1") as "type" | "data" | "data1";
const OWNER_LOCK_HASH = process.env.OWNER_LOCK_HASH || "";
const IS_MAINNET = process.env.CKB_NETWORK === "mainnet";

// Initialize the CKB client
const client = new CkbClient({
  rpcUrl: CKB_RPC_URL,
  indexerUrl: CKB_INDEXER_URL,
  isMainnet: IS_MAINNET,
});

// Create the MCP server
const server = new Server(
  {
    name: "ckb-xudt-token",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mint_token",
        description:
          "Mint new xUDT tokens to a specified address. Only the owner (issuer) can mint.",
        inputSchema: {
          type: "object",
          properties: {
            to_address: {
              type: "string",
              description: "CKB address to receive the minted tokens",
            },
            amount: {
              type: "string",
              description: "Amount of tokens to mint (as decimal string)",
            },
            private_key: {
              type: "string",
              description: "Owner's private key (hex with 0x prefix)",
            },
          },
          required: ["to_address", "amount", "private_key"],
        },
      },
      {
        name: "transfer_token",
        description: "Transfer xUDT tokens from one address to another.",
        inputSchema: {
          type: "object",
          properties: {
            from_address: {
              type: "string",
              description: "Sender's CKB address",
            },
            to_address: {
              type: "string",
              description: "Recipient's CKB address",
            },
            amount: {
              type: "string",
              description: "Amount of tokens to transfer (as decimal string)",
            },
            private_key: {
              type: "string",
              description: "Sender's private key (hex with 0x prefix)",
            },
          },
          required: ["from_address", "to_address", "amount", "private_key"],
        },
      },
      {
        name: "burn_token",
        description: "Burn xUDT tokens to permanently reduce the total supply.",
        inputSchema: {
          type: "object",
          properties: {
            from_address: {
              type: "string",
              description: "Address burning the tokens",
            },
            amount: {
              type: "string",
              description: "Amount of tokens to burn (as decimal string)",
            },
            private_key: {
              type: "string",
              description: "Burner's private key (hex with 0x prefix)",
            },
          },
          required: ["from_address", "amount", "private_key"],
        },
      },
      {
        name: "get_token_balance",
        description: "Query the xUDT token balance of a CKB address.",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "CKB address to query",
            },
            type_script_hash: {
              type: "string",
              description: "Type script hash of the token (hex with 0x prefix)",
            },
          },
          required: ["address", "type_script_hash"],
        },
      },
      {
        name: "deploy_contract",
        description: "Deploy a compiled RISC-V contract binary to the CKB chain.",
        inputSchema: {
          type: "object",
          properties: {
            binary_path: {
              type: "string",
              description: "Path to the compiled binary file",
            },
            private_key: {
              type: "string",
              description: "Deployer's private key (hex with 0x prefix)",
            },
          },
          required: ["binary_path", "private_key"],
        },
      },
    ],
  };
});

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "mint_token": {
        const result = await mintToken(
          client,
          {
            toAddress: args!.to_address as string,
            amount: args!.amount as string,
            privateKey: args!.private_key as string,
          },
          XUDT_CODE_HASH,
          XUDT_HASH_TYPE,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "transfer_token": {
        const result = await transferToken(
          client,
          {
            fromAddress: args!.from_address as string,
            toAddress: args!.to_address as string,
            amount: args!.amount as string,
            privateKey: args!.private_key as string,
          },
          XUDT_CODE_HASH,
          XUDT_HASH_TYPE,
          OWNER_LOCK_HASH,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "burn_token": {
        const result = await burnToken(
          client,
          {
            fromAddress: args!.from_address as string,
            amount: args!.amount as string,
            privateKey: args!.private_key as string,
          },
          XUDT_CODE_HASH,
          XUDT_HASH_TYPE,
          OWNER_LOCK_HASH,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_token_balance": {
        const result = await getTokenBalance(
          client,
          {
            address: args!.address as string,
            typeScriptHash: args!.type_script_hash as string,
          },
          XUDT_CODE_HASH,
          XUDT_HASH_TYPE,
          OWNER_LOCK_HASH,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "deploy_contract": {
        const result = await deployContract(client, {
          binaryPath: args!.binary_path as string,
          privateKey: args!.private_key as string,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CKB xUDT Token MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
