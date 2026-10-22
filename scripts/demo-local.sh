#!/usr/bin/env bash
# One-command local demo: anvil + deploy + backend (mock AI) + seed data + frontend.
# Uses anvil's public test keys only. Does NOT touch any .env file you created.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MN="test test test test test test test test test test test junk"
RPC="http://127.0.0.1:8545"
PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

NGO_KEY=$(cast wallet private-key --mnemonic "$MN" --mnemonic-index 0)
VER_KEY=$(cast wallet private-key --mnemonic "$MN" --mnemonic-index 1)
VER_ADDR=$(cast wallet address --private-key "$VER_KEY")

echo "==> Starting local chain"
anvil --silent &
PIDS+=($!)
until cast block-number --rpc-url "$RPC" >/dev/null 2>&1; do sleep 0.5; done

echo "==> Deploying contract"
CONTRACT=$(cd "$ROOT/contracts" && VERIFIER_ADDRESS="$VER_ADDR" forge script script/Deploy.s.sol \
  --rpc-url "$RPC" --broadcast --private-key "$NGO_KEY" 2>&1 | sed -n 's/.*DonationTrail deployed at \(0x[0-9a-fA-F]*\).*/\1/p' | head -1)
[ -n "$CONTRACT" ] || { echo "Deploy failed"; exit 1; }
echo "    $CONTRACT"

echo "==> Starting backend (mock AI)"
(cd "$ROOT/backend" && CHAIN=local RPC_URL="$RPC" CONTRACT_ADDRESS="$CONTRACT" \
  VERIFIER_PRIVATE_KEY="$VER_KEY" ANTHROPIC_API_KEY= npx tsx src/server.ts) &
PIDS+=($!)
until curl -fs localhost:8787/api/health >/dev/null 2>&1; do sleep 0.5; done

echo "==> Seeding demo data"
(cd "$ROOT/backend" && CHAIN=local RPC_URL="$RPC" CONTRACT_ADDRESS="$CONTRACT" NGO_KEY="$NGO_KEY" npx tsx scripts/seed.ts)

echo "==> Starting frontend on http://localhost:5173"
echo "    Wallet: add network RPC $RPC, chain id 31337, and import this NGO test key:"
echo "    $NGO_KEY (public anvil test key, worthless)"
(cd "$ROOT/frontend" && NEXT_PUBLIC_CHAIN=local NEXT_PUBLIC_RPC_URL="$RPC" NEXT_PUBLIC_CONTRACT_ADDRESS="$CONTRACT" \
  NEXT_PUBLIC_API_URL=http://localhost:8787 npx next dev -p 5173 -H 127.0.0.1) &
PIDS+=($!)
wait
