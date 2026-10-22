# DoraHacks Submission Text (Tech Track)

Paste into the DoraHacks form. Fill in the items marked TODO before submitting.

## Project name
Follow Your Dollar

## One-liner
Every donated dollar, traced to a receipt: a public on-chain trail where AI reads the receipt and the smart contract decides whether it matches.

## Track
Tech Track

## Description

**The problem.** Donors give to charities and relief funds and then see very little of what happens to their money. Reports are slow and summarized, overhead and misuse are hard to spot, and the organization controls the records. When trust breaks, people stop giving.

**Who it is for.** Donors who want proof, NGOs that want to earn trust and repeat support, and funders or auditors who need to check spending without chasing documents.

**What we built.** A working prototype on Base Sepolia:
- Donors give to an NGO campaign.
- The NGO pays onward hop by hop (field office, vendors) and attaches a receipt to each payment. The money is **held in escrow** by the contract.
- An AI step reads the receipt total. The smart contract compares it to the spend the NGO declared. A match **releases the funds automatically**. A mismatch **keeps the funds held** and flags the hop for a human reviewer, who can approve it or return the money to the campaign.
- A dashboard draws the trail as a live map. Released money flows, held money is dotted, and a mismatched hop turns red.

**How Web3 contributes.** The record of every hop, the receipt hash and the check result are public and cannot be edited afterwards, even by the NGO. Anyone can verify a campaign's trail themselves instead of trusting a report. The match rule is code anyone can read, not a decision made behind closed doors.

**Design principle.** AI proposes, deterministic code and the chain prove. The model only reads the receipt. It never decides validity.

**Honest limits.** The chain proves the record is unchanged, not that a receipt is genuine. Flagged hops go to a human reviewer, and a production version would use a quorum of reviewers instead of a single verifier wallet. This is a testnet prototype and has not been audited.

**Social impact.** Better transparency raises donor trust, which brings more giving, and gives well-run NGOs a way to prove it. A pilot would start with one willing NGO and one campaign.

**Feasibility and next steps.** Pilot with one NGO; reviewer quorum; receipt storage on decentralized storage; currency-aware comparison; stablecoin payments instead of test ETH.

## Technical architecture
See `docs/ARCHITECTURE.md` (diagram, flow, contract functions, trust model).

## Stack
Solidity + Foundry, Base Sepolia, Node/Express, viem, Next.js (React), Claude (vision) for receipt extraction.

## Links (TODO)
- GitHub repository: TODO
- Live demo link: TODO (frontend deployed, pointing at Base Sepolia contract)
- Demo video (2-3 min): TODO
- Contract address on Base Sepolia: TODO

## Team (TODO)
Names, roles, contact.
