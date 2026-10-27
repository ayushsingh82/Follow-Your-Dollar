<div align="center">

# Follow Your Dollar

**Every donated dollar, traced to a receipt.**

A public on-chain trail for donations. AI reads the receipt, a smart contract decides whether it matches, and funds are released only when it does.

![Solidity](https://img.shields.io/badge/Solidity-0.8-363636?logo=solidity)
![Foundry](https://img.shields.io/badge/Foundry-tested-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
[![Network](https://img.shields.io/badge/Base_Sepolia-live-0052FF)](https://sepolia.basescan.org/address/0xcaFEab1BDa988003c40fc318ED09004176417979)
![Status](https://img.shields.io/badge/status-prototype-yellow)

[Architecture](docs/ARCHITECTURE.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Submission text](docs/SUBMISSION.md)

</div>

---

## Live on Base Sepolia

The contract is deployed and running on the **Base Sepolia** test network.

| | |
|---|---|
| Network | Base Sepolia, chain id `84532` |
| RPC | `https://sepolia.base.org` |
| Contract | [`0xcaFEab1BDa988003c40fc318ED09004176417979`](https://sepolia.basescan.org/address/0xcaFEab1BDa988003c40fc318ED09004176417979) |
| Deployment transaction | [`0xd0d397d6…c273cacf`](https://sepolia.basescan.org/tx/0xd0d397d6bb6dd6b9f71edc5c255d7de3d310d3769e9c35b78cb7df32c273cacf) |
| Verifier (reviewer) wallet | [`0xB7D8e02413fF9f4CFAF86fdE9259a2511bB4aB40`](https://sepolia.basescan.org/address/0xB7D8e02413fF9f4CFAF86fdE9259a2511bB4aB40) |
| Block explorer | [sepolia.basescan.org](https://sepolia.basescan.org) |

The network, RPC and contract address are built into the code (`shared/network.json`), so no environment variables are needed to point the apps at the deployed contract. To use the app yourself, add Base Sepolia to your wallet (chain id `84532`) and get free test ETH from a Base Sepolia faucet.

## The problem

Donors give to charities and relief funds, then see very little of what happens next. Reports arrive late, are summarized, and are controlled by the organization that wrote them. When trust breaks, people stop giving.

## The solution

Follow Your Dollar puts every hop of a donation on a public trail, with a receipt behind each payment.

1. **Donate.** Donors fund an NGO campaign.
2. **Pay onward.** The NGO pays a vendor or field office and attaches a receipt. The funds are **held in escrow** by the contract.
3. **Read.** An AI model reads the receipt total. It only *proposes* a number.
4. **Decide.** The contract compares it with the declared spend, in plain code, on-chain.
   - **Match (within 1%)** → funds are released automatically.
   - **Mismatch** → funds stay held and the hop is flagged for a human reviewer, who approves it or returns the money to the campaign.
5. **Follow.** A dashboard draws the trail as a live map. Released money flows, held money is dotted, flagged hops are red.

> **AI proposes; deterministic code and the chain prove.** No model decides whether a hop is valid. The chain proves a record was not altered. It cannot prove a receipt is genuine, which is why mismatches go to human review.

## How it works

```mermaid
flowchart LR
  Donor([Donor]) -->|donate| C[DonationTrail contract]
  NGO([NGO]) -->|1. upload receipt| B[Backend API]
  B -->|2. read receipt| AI[Claude vision]
  AI -->|proposed total| B
  NGO -->|3. recordHop: funds + declared spend + receipt hash| C
  B -->|4. checkHop: extracted amount| C
  C --> R{Within 1%?}
  R -->|yes| Rel[Release funds]
  R -->|no| Held[Hold + flag for review]
  C -->|events + state| F[React dashboard]
```

Hop statuses: `Pending` (in escrow) · `Verified` (released) · `Flagged` (held for review) · `Approved` (reviewer released) · `Rejected` (returned to the campaign).

Full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository layout

| Path | Contents |
|---|---|
| `contracts/` | Foundry project: `DonationTrail.sol`, 25 tests, deploy script |
| `backend/` | Express API in TypeScript: receipt upload, AI extraction, on-chain check |
| `frontend/` | Next.js (React, TypeScript) dashboard with the trail map |
| `shared/` | Contract ABI used by both apps |
| `scripts/` | One-command local demo |
| `docs/` | Architecture, demo script, submission text |

## Quick start

**Prerequisites:** [Foundry](https://book.getfoundry.sh/getting-started/installation), Node.js 20+.

```bash
# one-time: contract test library, then dependencies
(cd contracts && forge install foundry-rs/forge-std --no-git)
(cd backend && npm install)
(cd frontend && npm install)

# anvil + deploy + backend (mock AI) + seeded data + frontend on http://localhost:5173
bash scripts/demo-local.sh
```

The script uses anvil's public test keys and never touches your own `.env` files. It prints the network settings and the test key to import into your wallet.

## Run step by step

```bash
# 1. Chain and contract
anvil                                          # terminal 1
cd contracts && forge test
VERIFIER_ADDRESS=<verifier address> forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil key>

# 2. Backend  (copy .env.example to .env first)
cd backend && npm start                        # http://localhost:8787

# 3. Frontend (copy .env.example to .env.local first)
cd frontend && npm run dev                     # http://localhost:3000
```

Environment variables are only needed for secrets (`VERIFIER_PRIVATE_KEY`, `ANTHROPIC_API_KEY`) and the backend URL. The commands above run against a local chain, which is what the one-command demo uses; it overrides the built-in network with `CHAIN=local` and `NEXT_PUBLIC_CHAIN=local`. With no config at all, both apps use the deployed Base Sepolia contract.

With no `ANTHROPIC_API_KEY`, the backend runs in **mock mode**: the uploader types the receipt total and results are labelled `source: "mock"`. Set the key for real extraction.

## Configuration

The network (Base Sepolia, chain id 84532), its RPC and the deployed contract address are set in code in `shared/network.json`. Only secrets and the backend URL are configured through the environment.

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `VERIFIER_PRIVATE_KEY` | Verifier wallet key (throwaway, testnet only). Required |
| `ANTHROPIC_API_KEY` | Enables real AI extraction; empty means mock mode |
| `ANTHROPIC_MODEL` | Model used for extraction |
| `PORT` | API port (default `8787`) |
| `FRONTEND_ORIGIN` | Comma-separated origins allowed by CORS |

**Frontend (`frontend/.env.local`)**: `NEXT_PUBLIC_API_URL`, the URL of the backend. Only public values belong here.

## Smart contract

| Function | Caller | Effect |
|---|---|---|
| `createCampaign(name)` | NGO | Creates a campaign owned by the caller |
| `donate(campaignId)` | Anyone | Adds test ETH to the campaign balance |
| `recordHop(...)` | Campaign NGO | Moves funds into escrow for a hop; stores declared spend and receipt hash |
| `checkHop(hopId, extractedCents)` | Verifier | Runs the match rule once: match releases, mismatch holds |
| `reviewHop(hopId, approve)` | Verifier (reviewer) | Resolves a flagged hop: release or return to the campaign |
| `reclaim(hopId)` | Campaign NGO | After 7 days, pulls back funds from an unresolved hop |

Safeguards: owner-only spending, verifier-only checks, one check per hop, hops cannot exceed the campaign balance, state is updated before any ETH transfer, and a recipient that refuses payment cannot block the process.

## Deploying your own copy to Base Sepolia

1. Create a throwaway deployer wallet and fund it with test ETH from a faucet. Never use a wallet that holds real funds.
2. Create a second throwaway wallet to act as the verifier, and give it a little test ETH for gas.
3. Deploy: `VERIFIER_ADDRESS=<verifier> forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --private-key <deployer key>`
4. Put the new contract address in `shared/network.json`.
5. Keep private keys in git-ignored `.env` files only, never in code or chat.

## Testing

| Suite | Command | Coverage |
|---|---|---|
| Contracts | `cd contracts && forge test` | 25 tests: access control, escrow accounting, match rule, review, reclaim |
| Backend | `cd backend && npm test` | 6 tests: extraction, schema validation, upload types |
| Types | `npm run typecheck` in `backend/` and `frontend/` | Strict TypeScript, no emit |
| End to end | `bash scripts/demo-local.sh` | Local chain with one Verified and one Flagged hop |

Real AI extraction has not been tested against the live API yet; it needs an API key.

## Security notes

- No keys in code; secrets are read from git-ignored `.env` files. The network and contract address are public and live in `shared/network.json`.
- Uploads are limited to 5 MB and to JPEG, PNG, WebP, GIF or PDF.
- The check endpoint accepts only an extraction whose hash equals the receipt hash stored on-chain for that hop, so one receipt cannot be substituted for another.
- CORS is restricted to configured frontend origins.

## Known limitations

- The chain proves a record is unchanged, not that a receipt is genuine. Flagged hops go to human review.
- A single verifier address submits checks and reviews flagged hops. A production version would use a reviewer quorum.
- Declared spend and receipt total are compared as plain numbers in one currency.
- Uploaded receipts are held in backend memory only; the chain stores just the hash.
- Unresolved hops can be reclaimed by the NGO after 7 days.
- Prototype on a testnet, not audited. Do not use with real funds.

## Roadmap

- Reviewer quorum and a public on-chain review record
- Currency-aware comparison with an oracle for exchange rates
- Receipt storage on decentralized storage, with only the hash on-chain
- Independent security audit

## Tech stack

Solidity 0.8 · Foundry · TypeScript · Node.js · Express · viem · zod · Claude (vision) · Next.js · React · Base Sepolia
