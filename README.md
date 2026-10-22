# Follow Your Dollar

Every donated dollar, traced to a receipt.

Donors give to an NGO campaign. The NGO pays vendors hop by hop and attaches a receipt to each payment; the funds are **held in escrow**. AI reads the receipt amount (it only proposes). The match rule runs on-chain in plain code: a match **releases the funds**, a mismatch **keeps them held** and flags the hop for a human reviewer (approve, or return the money to the campaign). The chain proves the record was not altered; it cannot prove a receipt is genuine.

## Layout

| Folder | What |
|---|---|
| `contracts/` | Foundry project: `DonationTrail.sol`, tests, deploy script |
| `backend/` | Express API: receipt upload, AI extraction, on-chain check |
| `frontend/` | Next.js (React) dashboard with the trail map |
| `shared/` | Contract ABI used by both apps |

## Quick demo (one command)

```bash
bash scripts/demo-local.sh   # anvil + deploy + backend (mock AI) + seeded data + frontend on :5173
```

It uses anvil's public test keys and never touches your own `.env` files.

Docs: [architecture](docs/ARCHITECTURE.md), [DoraHacks submission text](docs/SUBMISSION.md), [demo script](docs/DEMO_SCRIPT.md).

## Setup (first time)

```bash
cd contracts && forge install foundry-rs/forge-std --no-git   # contract test library
```

## Run locally step by step (mock AI, local chain)

```bash
# 1. chain + contract
anvil                                   # terminal 1
cd contracts && forge test
VERIFIER_ADDRESS=<verifier address> forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil key>

# 2. backend (copy .env.example to .env and fill in)
cd backend && npm install && npm start

# 3. frontend (copy .env.example to .env.local and fill in)
cd frontend && npm install && npm run dev   # http://localhost:3000
```

With no `ANTHROPIC_API_KEY` the backend runs in **mock mode**: the uploader types the receipt total, and results are labelled `source: "mock"`. Set the key for real extraction.

## Deploy to Base Sepolia

1. Create a throwaway wallet and fund it with test ETH from a faucet. Never use a wallet that holds real funds.
2. Use a second throwaway wallet as the verifier.
3. Deploy with `forge script ... --rpc-url <Base Sepolia RPC>` and set `CHAIN=baseSepolia` / `NEXT_PUBLIC_CHAIN=baseSepolia`.
4. Put private keys only in `.env` files (git-ignored), never in code or chat.

## Known limits

- Funds are escrowed on each hop; if nobody resolves a hop within 7 days the NGO can reclaim them.
- The declared spend and the receipt total are compared as plain numbers in the same currency.
- One verifier address submits checks and reviews flagged hops. A production version would use a reviewer quorum.
- Uploaded receipts are held in backend memory only; the chain stores just the hash.
- Prototype on a testnet, not audited.
