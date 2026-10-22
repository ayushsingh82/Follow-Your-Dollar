import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import multer from "multer";
import { keccak256 } from "viem";
import { publicClient, readHop, submitCheck, verifierAddress } from "./chain.js";
import { config } from "./config.js";
import { ALLOWED_TYPES, aiMode, extractReceipt } from "./extract.js";
import { getReceipt, saveReceipt } from "./store.js";

const app = express();
app.use(cors({ origin: config.frontendOrigins }));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

/** viem errors carry a friendlier shortMessage. */
const errorMessage = (err: unknown): string => {
  const e = err as { shortMessage?: string; message?: string };
  return e.shortMessage ?? e.message ?? "Unknown error";
};

const serialize = (value: unknown) =>
  JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

app.get("/api/health", async (_req, res) => {
  const block = await publicClient.getBlockNumber().catch(() => null);
  res.json({
    ok: block !== null,
    ai: aiMode,
    chain: config.chain,
    contract: config.contractAddress,
    verifier: verifierAddress,
  });
});

// Step 1: upload a receipt. Returns its hash (used in recordHop) and the extracted amount.
app.post("/api/receipts", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Attach a file in field 'file'" });
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return res.status(400).json({ error: "Unsupported file type (use JPEG, PNG, WebP, GIF or PDF)" });
    }

    const mockCents = req.body?.mockCents === undefined ? undefined : Number(req.body.mockCents);
    const extraction = await extractReceipt(file.buffer, file.mimetype, { mockCents });
    const receiptHash = keccak256(new Uint8Array(file.buffer));
    saveReceipt(receiptHash, extraction);

    res.json({ receiptHash, ...extraction });
  } catch (err) {
    res.status(422).json({ error: errorMessage(err) });
  }
});

// Step 2: after the NGO recorded the hop on-chain, trigger the on-chain check.
app.post("/api/hops/:hopId/check", async (req, res) => {
  try {
    const hopId = BigInt(req.params.hopId);
    const hop = await readHop(hopId);
    if (hop.campaignId === 0n) return res.status(404).json({ error: "Unknown hop" });

    if (hop.status !== "Pending") {
      return res.json(serialize({ hopId, status: hop.status, alreadyChecked: true }));
    }

    // The extraction must belong to the exact receipt hash stored on-chain for this hop.
    const extraction = getReceipt(hop.receiptHash);
    if (!extraction) {
      return res.status(409).json({ error: "No uploaded receipt matches this hop's receipt hash" });
    }

    const txHash = await submitCheck(hopId, extraction.totalCents);
    const updated = await readHop(hopId);
    res.json(
      serialize({
        hopId,
        status: updated.status,
        declaredCents: updated.declaredCents,
        extractedCents: updated.extractedCents,
        source: extraction.source,
        txHash,
      }),
    );
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: "Internal error" });
});

app.listen(config.port, () => {
  console.log(`Backend on :${config.port} | chain=${config.chain} | ai=${aiMode} | verifier=${verifierAddress}`);
});
