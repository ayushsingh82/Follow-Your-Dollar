"use client";

import { formatEther } from "viem";
import type { Hop } from "./chain";
import {
  RECLAIM_AFTER_SECONDS,
  STATUS_INFO,
  addressUrl,
  cents,
  isHeld,
  short,
  timeAgo,
} from "./utils";

interface Props {
  hop: Hop;
  isReviewer: boolean;
  isNgo: boolean;
  busy: boolean;
  onReview: (hopId: bigint, approve: boolean) => void;
  onReclaim: (hopId: bigint) => void;
}

export default function HopDetail({ hop, isReviewer, isNgo, busy, onReview, onReclaim }: Props) {
  const info = STATUS_INFO[hop.status];
  const checked = hop.status !== "Pending";
  const declared = Number(hop.declaredCents);
  const extracted = Number(hop.extractedCents);
  const gapPct = declared === 0 ? null : (Math.abs(declared - extracted) / declared) * 100;
  const canReclaim =
    isNgo && isHeld(hop.status) && Date.now() / 1000 >= Number(hop.timestamp) + RECLAIM_AFTER_SECONDS;
  const recipientUrl = addressUrl(hop.to);

  return (
    <section className={`card detail ${hop.status.toLowerCase()}`} aria-live="polite">
      <div className="row between">
        <h2>Hop #{hop.hopId.toString()}: {hop.label || "Recipient"}</h2>
        <span className={`tag ${hop.status.toLowerCase()}`}>{info.icon} {info.label}</span>
      </div>
      <p className="explain">{info.text}</p>

      <dl className="facts">
        <div><dt>Amount</dt><dd>{formatEther(hop.amount)} ETH</dd></div>
        <div><dt>Declared spend</dt><dd>{cents(hop.declaredCents)}</dd></div>
        <div>
          <dt>Receipt shows</dt>
          <dd>{checked ? cents(hop.extractedCents) : "Not checked yet"}</dd>
        </div>
        <div>
          <dt>Difference</dt>
          <dd>{checked && gapPct !== null ? `${gapPct.toFixed(1)}% (allowed: 1%)` : "—"}</dd>
        </div>
        <div>
          <dt>Recipient</dt>
          <dd>
            {recipientUrl ? <a href={recipientUrl} target="_blank" rel="noreferrer">{short(hop.to)}</a> : short(hop.to)}
          </dd>
        </div>
        <div><dt>Recorded</dt><dd>{timeAgo(hop.timestamp)}</dd></div>
        <div className="full"><dt>Receipt hash (stored on-chain)</dt><dd className="mono">{hop.receiptHash}</dd></div>
      </dl>

      {isReviewer && hop.status === "Flagged" && (
        <div className="review">
          <strong>Reviewer decision</strong>
          <div className="row">
            <button disabled={busy} onClick={() => onReview(hop.hopId, true)}>Approve and release funds</button>
            <button className="secondary" disabled={busy} onClick={() => onReview(hop.hopId, false)}>
              Reject and return to campaign
            </button>
          </div>
        </div>
      )}

      {canReclaim && (
        <div className="review">
          <strong>Unresolved for over 7 days</strong>
          <div className="row">
            <button className="secondary" disabled={busy} onClick={() => onReclaim(hop.hopId)}>
              Reclaim funds to the campaign
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
