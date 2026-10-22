import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config } from "./config.js";

// The AI only proposes these values. The match rule runs on-chain.
export const ReceiptSchema = z.object({
  totalCents: z.number().int().nonnegative(),
  vendor: z.string().max(200),
  currency: z.string().max(10),
  confidence: z.enum(["high", "medium", "low"]),
});

const PROMPT = `Read this receipt or invoice and reply with ONLY a JSON object, no other text:
{"totalCents": <final total paid as an integer number of the smallest currency unit, e.g. 12.50 -> 1250>,
 "vendor": "<seller name>",
 "currency": "<ISO code if visible, else empty string>",
 "confidence": "high" | "medium" | "low"}
If the document is not a receipt or the total is unreadable, use totalCents 0 and confidence "low".`;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const ALLOWED_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

const client = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;
export const aiMode = client ? "claude" : "mock";

function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model reply");
  return ReceiptSchema.parse(JSON.parse(text.slice(start, end + 1)));
}

function contentBlock(buffer, mimeType) {
  const data = buffer.toString("base64");
  if (mimeType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: mimeType, data } };
  }
  return { type: "image", source: { type: "base64", media_type: mimeType, data } };
}

/**
 * Returns { totalCents, vendor, currency, confidence, source }.
 * In mock mode (no API key) the caller must provide mockCents; the result is
 * labelled source "mock" so it is never mistaken for a real extraction.
 */
export async function extractReceipt(buffer, mimeType, { mockCents } = {}) {
  if (!client) {
    if (!Number.isInteger(mockCents) || mockCents < 0) {
      throw new Error("Mock mode: provide mockCents (non-negative integer)");
    }
    return { totalCents: mockCents, vendor: "mock", currency: "", confidence: "low", source: "mock" };
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const message = await client.messages.create({
        model: config.anthropicModel,
        max_tokens: 300,
        messages: [
          { role: "user", content: [contentBlock(buffer, mimeType), { type: "text", text: PROMPT }] },
        ],
      });
      const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      return { ...parseJson(text), source: "claude" };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Receipt extraction failed: ${lastError?.message ?? "unknown error"}`);
}
