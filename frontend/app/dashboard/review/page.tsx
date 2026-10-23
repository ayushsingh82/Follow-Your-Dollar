"use client";

import HopDetail from "../../../src/HopDetail";
import { useDapp } from "../../../src/dapp";
import { short } from "../../../src/utils";

export default function Review() {
  const d = useDapp();
  const flagged = d.hops.filter((h) => h.status === "Flagged");

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Review queue</h1>
        <p>Payments where the receipt did not match the declared spend. The money stays held until a reviewer approves it or returns it to the campaign.</p>
      </div>

      {!d.isReviewer && (
        <p className="banner">
          {d.wallet
            ? `Only the reviewer wallet ${d.verifier ? `(${short(d.verifier)}) ` : ""}can approve or reject. You can still see what is waiting.`
            : "Connect the reviewer wallet to approve or reject. You can still see what is waiting."}
        </p>
      )}

      {flagged.length === 0 ? (
        <div className="card empty">
          <h2>Nothing to review</h2>
          <p className="muted">Every payment of this campaign is either released, in escrow, or already resolved.</p>
        </div>
      ) : (
        flagged.map((h) => (
          <HopDetail key={h.hopId.toString()} hop={h} isReviewer={d.isReviewer} isNgo={d.isNgo} busy={d.busy} onReview={d.reviewHop} onReclaim={d.reclaim} />
        ))
      )}
    </div>
  );
}
