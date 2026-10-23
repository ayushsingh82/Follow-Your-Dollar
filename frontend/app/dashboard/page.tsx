"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { Donate } from "../../src/Forms";
import HopDetail from "../../src/HopDetail";
import TrailMap from "../../src/TrailMap";
import { useDapp } from "../../src/dapp";
import { STATUS_INFO, addressUrl, eth, isHeld, isReleased, short, timeAgo } from "../../src/utils";

export default function Overview() {
  const d = useDapp();
  const { campaign, hops } = d;

  const released = hops.filter((h) => isReleased(h.status)).reduce((s, h) => s + h.amount, 0n);
  const escrow = hops.filter((h) => isHeld(h.status)).reduce((s, h) => s + h.amount, 0n);
  const verified = hops.filter((h) => isReleased(h.status)).length;
  const flagged = hops.filter((h) => h.status === "Flagged").length;
  const pending = hops.filter((h) => h.status === "Pending").length;
  const recent = [...hops].reverse().slice(0, 6);

  return (
    <div className="stack">
      {d.loading && <p className="muted">Loading from the blockchain…</p>}

      {!d.loading && !campaign && (
        <div className="card empty">
          <h2>No campaigns yet</h2>
          <p className="muted">Open the NGO desk, connect a wallet and start one to see its trail here.</p>
          <div><Link className="btn" href="/dashboard/ngo">Go to NGO desk</Link></div>
        </div>
      )}

      {campaign && (
        <>
          <section className="hero-card">
            <div>
              <span className="lab">Campaign</span>
              <h1>{campaign.name}</h1>
              <p className="muted">
                Run by NGO{" "}
                {addressUrl(campaign.ngo) ? (
                  <a href={addressUrl(campaign.ngo)!} target="_blank" rel="noreferrer">{short(campaign.ngo)}</a>
                ) : (
                  short(campaign.ngo)
                )}
                {" · "}
                {hops.length === 0
                  ? "no payments yet"
                  : `${verified} of ${hops.length} payment${hops.length === 1 ? "" : "s"} verified by receipt`}
                {flagged ? ` · ${flagged} held for review` : ""}
                {pending ? ` · ${pending} awaiting check` : ""}
              </p>
            </div>
            <div className="hero-actions">
              <Link className="btn" href="/dashboard/donate">Donate</Link>
              <Link className="btn ghost" href="/dashboard/receipts">All receipts</Link>
            </div>

            <div className="flow-wrap">
              <span className="lab">Where the {formatEther(campaign.raised)} ETH raised is now</span>
              <FlowBar raised={campaign.raised} released={released} escrow={escrow} unspent={campaign.balance} />
            </div>
          </section>

          <div className="stats">
            <Stat label="Raised" value={`${formatEther(campaign.raised)} ETH`} />
            <Stat label="Released" value={`${formatEther(released)} ETH`} />
            <Stat label="In escrow" value={`${formatEther(escrow)} ETH`} warn={escrow > 0n} />
            <Stat label="Not yet spent" value={`${formatEther(campaign.balance)} ETH`} />
          </div>

          <div className="split">
            <section className="card">
              <h2>Trail map</h2>
              <div className="trail-wrap">
                <TrailMap campaign={campaign} hops={hops} selectedHopId={d.selectedHopId} onSelect={d.selectHop} />
              </div>
              <p className="swipe-hint">Swipe the map sideways to see every payment</p>
              <ul className="legend" aria-label="Legend">
                {Object.entries(STATUS_INFO).map(([status, info]) => (
                  <li key={status} className={status.toLowerCase()}>{info.label}</li>
                ))}
                <li className="note">Moving lines = released · dotted = held in escrow</li>
              </ul>
            </section>

            <aside className="stack">
              {flagged > 0 && (
                <Link href="/dashboard/review" className="alert">
                  <span className="lab">Needs a decision</span>
                  <strong>{flagged} payment{flagged === 1 ? "" : "s"} held for review</strong>
                  <span>Open the review queue</span>
                </Link>
              )}

              <section className="card">
                <h3>Take part</h3>
                {d.wallet ? (
                  <>
                    <p className="muted small">You are connected as {d.role}. Donate straight from here, or use the desks below.</p>
                    <Donate onSubmit={d.donate} disabled={d.busy} compact />
                    <div className="row">
                      {d.isNgo && <Link className="btn ghost" href="/dashboard/ngo">Pay a vendor</Link>}
                      {d.isReviewer && <Link className="btn ghost" href="/dashboard/review">Review queue</Link>}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="muted small">Connect a wallet to donate, pay vendors as the NGO, or review flagged payments.</p>
                    <div><button onClick={d.connect} disabled={d.busy}>Connect wallet</button></div>
                  </>
                )}
              </section>

              <section className="card">
                <h3>Latest payments</h3>
                {recent.length === 0 ? (
                  <p className="muted small">Nothing yet.</p>
                ) : (
                  <ul className="feed">
                    {recent.map((h) => (
                      <li key={h.hopId.toString()}>
                        <button className="feed-row" onClick={() => d.selectHop(h.hopId)}>
                          <span className="feed-main">
                            <strong>{h.label || short(h.to)}</strong>
                            <span className="muted small">{eth(h.amount)} · {timeAgo(h.timestamp)}</span>
                          </span>
                          <span className={`tag ${h.status.toLowerCase()}`}>{STATUS_INFO[h.status].label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>

          {d.selectedHop && (
            <HopDetail
              hop={d.selectedHop}
              isReviewer={d.isReviewer}
              isNgo={d.isNgo}
              busy={d.busy}
              onReview={d.reviewHop}
              onReclaim={d.reclaim}
            />
          )}
        </>
      )}
    </div>
  );
}

function FlowBar({ raised, released, escrow, unspent }: { raised: bigint; released: bigint; escrow: bigint; unspent: bigint }) {
  const total = raised === 0n ? 1n : raised;
  const pct = (v: bigint) => Number((v * 10000n) / total) / 100;
  const parts = [
    { key: "released", label: "Released", value: released, color: "var(--brand)" },
    { key: "escrow", label: "In escrow", value: escrow, color: "var(--ink)" },
    { key: "unspent", label: "Not yet spent", value: unspent, color: "#bcd0ff" },
  ];
  return (
    <>
      <div className="flow-bar" role="img" aria-label="Share of raised funds by state">
        {parts.map((p) => (
          <span key={p.key} style={{ width: `${pct(p.value)}%`, background: p.color }} />
        ))}
      </div>
      <ul className="flow-legend">
        {parts.map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            {p.label} <strong>{formatEther(p.value)} ETH</strong> <span className="muted">({pct(p.value).toFixed(0)}%)</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`stat ${warn ? "warn" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
