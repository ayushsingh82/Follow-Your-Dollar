import type { Extraction } from "./extract.js";

// In-memory map of receiptHash -> extraction result. Fine for a prototype;
// a restart loses pending extractions (re-upload the receipt).
const receipts = new Map<string, Extraction>();

export const saveReceipt = (hash: string, extraction: Extraction) => receipts.set(hash.toLowerCase(), extraction);
export const getReceipt = (hash: string) => receipts.get(hash.toLowerCase());
