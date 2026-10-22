# Tech Track Plan: Follow Your Dollar

**Deadline for submission:** Oct 25, 05:30 IST (about 3 days from Oct 22)

## What the Tech Track needs

A **working Web3 prototype or demo** that addresses a social challenge and clearly shows:
- the idea
- the intended users or beneficiaries
- how Web3 contributes

Allowed stack: EVM chains, Solana, Aptos, Sui or others. AI, decentralized storage, identity, ZK and oracles are optional.

Later stages (only if shortlisted): presentation video Nov 1-3, then final demo at SMU on Nov 26 (Tech Track slot 14:30-16:00, with judges' Q&A). Because the submission is due in about 3 days, plan for a demo video and a README at submission time.

## The product in one line

A donation moves across a map, hop by hop (donor to NGO to field office to vendor). Each hop has a receipt that AI reads and a deterministic rule checks, and every hop is recorded on-chain. A mismatch turns the hop red.

Design principle (borrowed from the RuleLift example): **AI proposes, deterministic code and the chain prove.** AI only extracts receipt data. The matching check and the on-chain record are plain code.

## Scope for 3 days (MVP)

| Must have | Nice to have | Skip |
|---|---|---|
| Solidity contract: create campaign, record hops, store receipt hash and status | Human reviewer approval screen | Real payments |
| Test-token donations on a testnet | Multiple campaigns | Mainnet deployment |
| Receipt upload and AI extraction of amount and vendor | Public audit page | Mobile app |
| Deterministic check: receipt amount matches hop amount | Auto-generated trust score | Real KYC |
| React map dashboard showing hops, red flag on mismatch | | |
| Seeded demo data with one good and one mismatched hop | | |
| README and 2-3 minute demo video | | |

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Chain | **Base Sepolia** (EVM testnet, decided) | Low fees, familiar EVM tooling, free test ETH from faucets |
| Contracts | Solidity with Foundry or Hardhat | Fast to test |
| Frontend | React + Vite + a map library | Quick to build |
| Wallet | wagmi / ethers | Standard |
| AI step | Claude API for receipt extraction with a schema-validated output | Structured output, simple |
| Storage | Receipt files kept off-chain, only the hash stored on-chain | Cheap, private |

Chain is decided (Base Sepolia). Still to confirm: Foundry or Hardhat (I suggest Foundry).

## Architecture (simple)

1. Donor sends test tokens to a campaign contract.
2. NGO or vendor records a hop (from, to, amount) and uploads a receipt.
3. Backend sends the receipt to the AI step, which returns amount and vendor as validated JSON.
4. Deterministic check compares the extracted amount to the hop amount and returns match or mismatch.
5. The receipt hash and the check result are written on-chain.
6. The dashboard reads the contract and draws the hops, with mismatches in red.

## Work plan

| Day | Tasks |
|---|---|
| Oct 22 (today) | Choose stack, scaffold repo, write and test the contract |
| Oct 23 | Receipt extraction and check, backend endpoint, seeded data |
| Oct 24 | Map dashboard, wire to contract, polish the demo path, record video |
| Oct 25 (before 05:30 IST) | README, submit on DoraHacks, buffer for problems |

## What is needed from you

- Chain and tooling choice (or approve the proposal above)
- API key for the AI step (kept in an environment file, never committed)
- Testnet wallet and test funds
- Team name, members, and a project logo if the form asks
- Hosting for the demo (e.g. a free static host) and a GitHub repo link

## Judging fit

- **Impact 30%:** donor trust is a real problem, so add a verified statistic with a source
- **Solution quality 25%:** a full working flow, including the red-flag case
- **Web3 use 20%:** an immutable public trail the NGO cannot edit
- **Feasibility 15%:** pilot with one willing NGO
- **Demo 10%:** give $10, watch it travel, one hop turns red

## Risks

- The chain proves the record was not changed, not that a receipt is genuine. Mitigation: AI check plus rule check plus human review for flagged hops, and say this openly.
- AI extraction errors. Mitigation: schema validation, plus a manual correction path.
- Time. Mitigation: keep to the MVP table and use seeded data for the demo.
- Live demo failure. Mitigation: a recorded backup video.

## Open questions

- Can one team enter both tracks?
- Exact DoraHacks submission fields
