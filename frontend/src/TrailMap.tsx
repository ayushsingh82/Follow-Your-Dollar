"use client";

import type { Campaign, Hop } from "./chain";
import { STATUS_INFO, eth, isReleased, short } from "./utils";

/**
 * Donors -> NGO -> each hop recipient.
 * Status is shown by colour, icon and text. Animated edges mean money has moved;
 * static dotted edges mean it is held in escrow. Hops are clickable and keyboard-focusable.
 */
export default function TrailMap({
  campaign,
  hops,
  selectedHopId,
  onSelect,
}: {
  campaign: Campaign;
  hops: Hop[];
  selectedHopId: bigint | null;
  onSelect: (hopId: bigint) => void;
}) {
  const rowGap = 96;
  const height = Math.max(260, 120 + hops.length * rowGap);
  const midY = height / 2;
  const hopY = (i: number) => (hops.length === 1 ? midY : 70 + i * ((height - 140) / Math.max(1, hops.length - 1)));

  return (
    <svg className="trail" viewBox={`0 0 900 ${height}`} role="group" aria-label="Donation trail map">
      <Edge x1={170} y1={midY} x2={330} y2={midY} className="edge raised flowing" label={eth(campaign.raised)} />

      {hops.map((h, i) => {
        const key = h.hopId.toString();
        const info = STATUS_INFO[h.status];
        const selected = selectedHopId !== null && h.hopId === selectedHopId;
        const activate = () => onSelect(h.hopId);
        return (
          <g key={key}>
            <Edge
              x1={450}
              y1={midY}
              x2={640}
              y2={hopY(i)}
              className={`edge ${h.status.toLowerCase()} ${
                isReleased(h.status) ? "flowing" : h.status === "Rejected" ? "returned" : "held"
              }`}
              label={eth(h.amount)}
            />
            <g
              transform={`translate(640 ${hopY(i) - 34})`}
              className={`node hop ${h.status.toLowerCase()} ${selected ? "selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${h.label || "Recipient"}, ${info.label}. Show details`}
              onClick={activate}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), activate())}
            >
              <rect width="230" height="68" rx="10" />
              <text x="14" y="26" className="node-title">{h.label || "Recipient"}</text>
              <text x="14" y="46" className="node-sub">{short(h.to)}</text>
              <text x="14" y="62" className="node-status">{info.icon} {info.label}</text>
            </g>
          </g>
        );
      })}

      <g transform={`translate(20 ${midY - 34})`} className="node donors">
        <rect width="150" height="68" rx="10" />
        <text x="14" y="30" className="node-title">Donors</text>
        <text x="14" y="52" className="node-sub">{eth(campaign.raised)} given</text>
      </g>

      <g transform={`translate(330 ${midY - 34})`} className="node ngo">
        <rect width="120" height="68" rx="10" />
        <text x="14" y="26" className="node-title">NGO</text>
        <text x="14" y="44" className="node-sub">{short(campaign.ngo)}</text>
        <text x="14" y="60" className="node-sub">{eth(campaign.balance)} left</text>
      </g>
    </svg>
  );
}

function Edge({
  x1,
  y1,
  x2,
  y2,
  className,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className: string;
  label: string;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className={className} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} className="edge-label" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
