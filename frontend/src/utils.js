import { formatEther } from "viem";
import { chain } from "./chain.js";

export const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const cents = (v) => (Number(v) / 100).toFixed(2);
export const eth = (v) => `${Number(formatEther(v)).toFixed(4)} ETH`;
export const sameAddress = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export const RECLAIM_AFTER_SECONDS = 7 * 24 * 60 * 60;

export function timeAgo(timestampSeconds) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(timestampSeconds));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export const explorerBase = chain.blockExplorers?.default.url;
export const addressUrl = (a) => (explorerBase ? `${explorerBase}/address/${a}` : null);

/** Icon, short label and plain-language explanation for each hop status. */
export const STATUS_INFO = {
  Pending: {
    icon: "⏳",
    label: "In escrow",
    text: "The funds are held in the contract until the receipt has been checked.",
  },
  Verified: {
    icon: "✓",
    label: "Released",
    text: "The receipt matched the declared spend, so the contract released the funds automatically.",
  },
  Flagged: {
    icon: "!",
    label: "Held for review",
    text: "The receipt did not match the declared spend. The funds stay in the contract until a reviewer decides.",
  },
  Approved: {
    icon: "✓",
    label: "Approved",
    text: "A reviewer looked at the flagged hop, approved it, and the funds were released.",
  },
  Rejected: {
    icon: "↩",
    label: "Returned",
    text: "The funds were returned to the campaign and were not paid to the recipient.",
  },
};

export const isReleased = (status) => status === "Verified" || status === "Approved";
export const isHeld = (status) => status === "Pending" || status === "Flagged";
