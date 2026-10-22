import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePrivateKey } from "viem/accounts";

// config.js reads required env vars at import time.
process.env.CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
process.env.VERIFIER_PRIVATE_KEY = generatePrivateKey(); // throwaway, never used on a chain
process.env.ANTHROPIC_API_KEY = "";

const { ReceiptSchema, extractReceipt, aiMode, ALLOWED_TYPES } = await import("../src/extract.js");

test("runs in mock mode without an API key", () => {
  assert.equal(aiMode, "mock");
});

test("mock mode returns the supplied amount and labels it as mock", async () => {
  const result = await extractReceipt(Buffer.from("x"), "image/png", { mockCents: 4200 });
  assert.equal(result.totalCents, 4200);
  assert.equal(result.source, "mock");
});

test("mock mode rejects a missing or invalid amount", async () => {
  await assert.rejects(() => extractReceipt(Buffer.from("x"), "image/png", {}));
  await assert.rejects(() => extractReceipt(Buffer.from("x"), "image/png", { mockCents: -1 }));
  await assert.rejects(() => extractReceipt(Buffer.from("x"), "image/png", { mockCents: 1.5 }));
});

test("schema accepts a valid extraction", () => {
  const parsed = ReceiptSchema.parse({ totalCents: 1250, vendor: "Shop", currency: "USD", confidence: "high" });
  assert.equal(parsed.totalCents, 1250);
});

test("schema rejects non-integer, negative and malformed values", () => {
  assert.throws(() => ReceiptSchema.parse({ totalCents: 12.5, vendor: "Shop", currency: "", confidence: "high" }));
  assert.throws(() => ReceiptSchema.parse({ totalCents: -5, vendor: "Shop", currency: "", confidence: "high" }));
  assert.throws(() => ReceiptSchema.parse({ totalCents: 5, vendor: "Shop", currency: "", confidence: "sure" }));
  assert.throws(() => ReceiptSchema.parse({ vendor: "Shop" }));
});

test("only images and PDFs are allowed uploads", () => {
  assert.ok(ALLOWED_TYPES.has("image/png"));
  assert.ok(ALLOWED_TYPES.has("application/pdf"));
  assert.ok(!ALLOWED_TYPES.has("text/html"));
  assert.ok(!ALLOWED_TYPES.has("image/svg+xml"));
});
