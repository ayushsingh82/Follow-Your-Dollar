// In-memory map of receiptHash -> extraction result. Fine for a prototype;
// a restart loses pending extractions (re-upload the receipt).
const receipts = new Map();

export const saveReceipt = (hash, extraction) => receipts.set(hash.toLowerCase(), extraction);
export const getReceipt = (hash) => receipts.get(hash.toLowerCase());
