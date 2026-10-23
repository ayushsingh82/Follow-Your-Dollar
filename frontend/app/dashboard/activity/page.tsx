"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { loadActivity, STATUS } from "../../../src/chain";
import type { ActivityLog } from "../../../src/chain";
import { useDapp } from "../../../src/dapp";
import { cents, short, txUrl } from "../../../src/utils";

const KIND: Record<string, { tag: string; color: string }> = {
  CampaignCreated: { tag: "Campaign", color: "var(--brand-d)" },
  Donated: { tag: "Donation", color: "var(--ok)" },
  HopRecorded: { tag: "Escrow", color: "var(--warn)" },
  HopChecked: { tag: "Check", color: "var(--ink)" },
  HopReviewed: { tag: "Review", color: "var(--bad)" },
  HopReclaimed: { tag: "Reclaim", color: "var(--mute)" },
};

function describe(l: ActivityLog): string {
  const a = l.args as Record<string, never>;
  switch (l.eventName) {
    case "CampaignCreated":
      return `NGO ${short(String(a.ngo))} started campaign #${String(a.campaignId)}: "${String(a.name)}"`;
    case "Donated":
      return `${short(String(a.donor))} donated ${formatEther(a.amount as bigint)} ETH to campaign #${String(a.campaignId)}`;
    case "HopRecorded":
      return `${formatEther(a.amount as bigint)} ETH put in escrow for hop #${String(a.hopId)} (${String(a.label) || short(String(a.to))}), declared ${cents(a.declaredCents as bigint)}`;
    case "HopChecked":
      return `Hop #${String(a.hopId)} checked: declared ${cents(a.declaredCents as bigint)}, receipt ${cents(a.extractedCents as bigint)}, so ${STATUS[Number(a.status)]}`;
    case "HopReviewed":
      return `Reviewer ${a.approved ? "approved" : "rejected"} hop #${String(a.hopId)}`;
    case "HopReclaimed":
      return `NGO reclaimed funds from hop #${String(a.hopId)}`;
    default:
      return l.eventName;
  }
}

export default function Activity() {
  const d = useDapp();
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!d.configured) return;
    const load = () => loadActivity().then((l) => { setLogs(l); setError(null); }).catch((e) => setError(e.shortMessage ?? e.message));
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [d.configured]);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Activity</h1>
        <p>Every transaction people make through the contract: donations, payments into escrow, receipt checks and reviewer decisions.</p>
      </div>

      <section className="card">
        <h2>Your transactions</h2>
        {d.txs.length === 0 ? (
          <p className="muted">Nothing yet this session. Donate, or pay a vendor from the NGO desk, and your transactions appear here.</p>
        ) : (
          <ul className="feed">
            {d.txs.map((t) => (
              <li key={t.hash}>
                <div className="feed-row" style={{ cursor: "default" }}>
                  <span className="feed-main">
                    <strong>{t.label}</strong>
                    <span className="muted small">
                      {txUrl(t.hash) ? <a href={txUrl(t.hash)!} target="_blank" rel="noreferrer" className="mono">{t.hash}</a> : <span className="mono">{t.hash}</span>}
                    </span>
                  </span>
                  <span className={`tag ${t.state === "confirmed" ? "verified" : "pending"}`}>{t.state}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="row between">
          <h2>On-chain activity</h2>
          <span className="lab">Refreshes every 8 seconds</span>
        </div>
        {error && <p className="field-error">{error}</p>}
        {logs === null && !error && <p className="muted">Reading the chain…</p>}
        {logs && logs.length === 0 && <p className="muted">No activity yet.</p>}
        {logs && logs.length > 0 && (
          <ul className="timeline">
            {logs.map((l) => {
              const k = KIND[l.eventName] ?? { tag: l.eventName, color: "var(--ink)" };
              const url = txUrl(l.txHash);
              return (
                <li key={l.id}>
                  <span className="tl-tag" style={{ color: k.color, borderColor: k.color }}>{k.tag}</span>
                  <div>
                    <p>{describe(l)}</p>
                    <p className="muted small">
                      Block {l.block.toString()} ·{" "}
                      {url ? <a href={url} target="_blank" rel="noreferrer" className="mono">{short(l.txHash)}</a> : <span className="mono">{short(l.txHash)}</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
