# Demo Script (2-3 minutes)

## Before recording
- Contract deployed on Base Sepolia, backend running with the real AI key, frontend open.
- Wallet connected as the NGO, with test ETH. For the reviewer step, have the verifier wallet ready in a second browser profile (or switch accounts): the Approve and Reject buttons only appear for that wallet.
- Two receipt images ready: one that matches the declared amount, one that does not (e.g. a real receipt, and the same one declared higher).
- Have a second tab on the block explorer for the contract.
- For a quick rehearsal without testnet, run `scripts/demo-local.sh` (mock AI, local chain, seeded data).

## Script

| Time | Say | Show |
|---|---|---|
| 0:00 | "Donors give and then hear almost nothing. Reports can be late, summarized and edited by the organization." | Title slide or the dashboard |
| 0:20 | "Follow Your Dollar puts every hop of a donation on a public trail, with a receipt behind each one." | Campaign page: Donors → NGO map |
| 0:40 | "I donate to this flood-relief campaign." | Donate, confirm in wallet |
| 1:00 | "The NGO pays a vendor and uploads the receipt. The AI only reads the total. The contract decides." | Send-onward form with the matching receipt |
| 1:25 | "The money sat in escrow. The receipt matches the declared spend, so the contract released it and the hop turns green." | Map updates, green hop |
| 1:45 | "Now a payment where the receipt shows less than what was declared." | Send a mismatching receipt |
| 2:05 | "The contract refuses to release it. The money stays held, the hop is red, and a reviewer must approve it or send the money back. Nobody, including the NGO, can quietly change it." | Red hop, detail panel with the 1% rule, then reviewer clicks Reject or Approve |
| 2:25 | "Anyone can check this on the explorer." | Block explorer tab |
| 2:40 | "Limits: the chain proves the record is unchanged, not that a receipt is real, so flagged hops go to human review. Next: escrow until verified and a reviewer quorum." | Closing slide |

## If something breaks live
- Keep a recorded backup video.
- If the AI is slow, show the seeded campaign that already has verified and flagged hops.
