.PHONY: build-contracts test-contracts build-sdk deploy-devnet start-devnet stop-devnet

build-contracts:
	cargo build --release --target riscv64imac-unknown-none-elf

test-contracts:
	cargo test -p xudt-tests

build-sdk:
	cd mcp-sdk && pnpm build

deploy-devnet:
	cd scripts && npx tsx deploy.ts

start-devnet:
	docker-compose -f devenv/docker-compose.yml up -d

stop-devnet:
	docker-compose -f devenv/docker-compose.yml down
