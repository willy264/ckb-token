# CKB xUDT Fungible Token

A complete, production-ready fungible token implementation on the CKB (Common Knowledge Base) blockchain following the xUDT (Extensible User Defined Token) standard.

## Project Structure

```
token/
├── Cargo.toml                    # Rust workspace root
├── pnpm-workspace.yaml           # pnpm monorepo root
├── Makefile                      # build/test/deploy shortcuts
├── .env.example                  # env variable template
├── contracts/
│   ├── xudt-type-script/         # Core token Type Script
│   ├── owner-lock-script/        # Owner lock (mint authority)
│   └── tests/                    # On-chain contract tests
├── scripts/                      # Deployment and example scripts
└── devenv/                       # Local development environment
```

## Prerequisites

- **Rust** with RISC-V target: `rustup target add riscv64imac-unknown-none-elf`
- **RISC-V GCC toolchain**: Install `riscv-none-elf-gcc` (or `riscv64-unknown-elf-gcc`)
- **Node.js** >= 18
- **pnpm** >= 8: `npm install -g pnpm`
- **Docker** and **Docker Compose** (for local devnet)

## Quick Start

### 1. Set Up the Local Devnet

Start a local CKB node and indexer:

```bash
make start-devnet
```

This launches a CKB node at `http://127.0.0.1:8114` and an indexer at `http://127.0.0.1:8116` via Docker Compose. The auto-miner produces blocks every 2 seconds for fast development.

To stop the devnet:

```bash
make stop-devnet
```

### 2. Build the Contracts

Compile the on-chain scripts to RISC-V binaries:

```bash
make build-contracts
```

The compiled binaries will be at:
- `target/riscv64imac-unknown-none-elf/release/xudt-type-script`
- `target/riscv64imac-unknown-none-elf/release/owner-lock-script`

### 3. Run Contract Tests

```bash
make test-contracts
```

This runs all 5 test scenarios:
- `test_mint_with_owner_lock` — valid mint with owner lock present
- `test_mint_without_owner_lock` — mint attempt without owner lock (should fail)
- `test_transfer_equal_amounts` — valid transfer preserving total amount
- `test_transfer_creates_tokens` — invalid transfer creating tokens (should fail)
- `test_burn_tokens` — valid burn reducing total supply

### 4. Deploy Contracts to Devnet

First, copy and configure the environment:

```bash
cp .env.example .env
# Edit .env with your owner private key and other settings
```

Then deploy:

```bash
make deploy-devnet
```

This deploys both the xUDT type script and owner lock script binaries to the local devnet. Note the transaction hashes printed — update your `.env` with `XUDT_TX_HASH` and `OWNER_LOCK_TX_HASH`.

### 5. Mint Tokens

```bash
cd scripts
npx tsx mint-token.ts
```

This mints an initial token supply to the owner address. Edit `mint-token.ts` to change the amount.

### 6. Transfer Tokens

```bash
cd scripts
npx tsx transfer-token.ts
```

This transfers tokens between addresses. Edit `transfer-token.ts` to change the recipient and amount.

### 7. Check Token Balance

```bash
cd scripts
npx tsx check-balance.ts
```

This queries the token balance for a given address.

## Key CKB Concepts

- **Cells are immutable**: You consume input cells and create new output cells.
- **Token amount in cell.data**: Encoded as 16-byte little-endian Uint128.
- **Type Script args = owner lock hash**: 32-byte hash identifying who can mint.
- **xUDT rule**: `sum(input amounts) == sum(output amounts)` UNLESS the owner lock is in inputs (for minting).
- **Scripts return 0 for success**: Any non-zero return code rejects the transaction.

