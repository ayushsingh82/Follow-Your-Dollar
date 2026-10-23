"use client";

import HopDetail from "../../../src/HopDetail";
import { useDapp } from "../../../src/dapp";
import { STATUS_INFO, cents, eth, short } from "../../../src/utils";

export default function Receipts() {
  const d = useDapp();

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Receipts</h1>
        <p>Every payment of the selected campaign: the spend the NGO declared, and what the receipt actually shows.</p>
      </div>

      {d.hops.length === 0 ? (
        <div className="card empty">
          <h2>No receipts yet</h2>
          <p className="muted">Payments appear here once the NGO sends money onward with a receipt.</p>
        </div>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Recipient</th><th>Amount</th><th>Declared</th><th>Receipt shows</th><th>Status</th></tr>
              </thead>
              <tbody>
                {d.hops.map((h) => (
                  <tr key={h.hopId.toString()} className={h.hopId === d.selectedHopId ? "selected" : ""} onClick={() => d.selectHop(h.hopId)}>
                    <td>{h.hopId.toString()}</td>
                    <td>{h.label || short(h.to)}</td>
                    <td>{eth(h.amount)}</td>
                    <td>{cents(h.declaredCents)}</td>
                    <td>{h.status === "Pending" ? "—" : cents(h.extractedCents)}</td>
                    <td><span className={`tag ${h.status.toLowerCase()}`}>{STATUS_INFO[h.status].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Select a row for details, the 1% rule check and the on-chain receipt hash.</p>
        </section>
      )}

      {d.selectedHop && (
        <HopDetail hop={d.selectedHop} isReviewer={d.isReviewer} isNgo={d.isNgo} busy={d.busy} onReview={d.reviewHop} onReclaim={d.reclaim} />
      )}
    </div>
  );
}
