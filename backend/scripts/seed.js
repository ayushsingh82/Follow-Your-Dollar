// Seeds demo data through the real flow: create campaign, donate, then three hops
// (two matching receipts, one mismatching) checked by the running backend.
// Env: CONTRACT_ADDRESS, NGO_KEY, API_URL (default http://localhost:8787),
//      CHAIN (local|baseSepolia), RPC_URL (optional)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, parseEther, parseEventLogs } from "viem";
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts";
import { baseSepolia, foundry } from "viem/chains";

const need = (n) => {
  if (!process.env[n]) throw new Error(`Missing env var ${n}`);
  return process.env[n];
};

const abi = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../shared/DonationTrail.abi.json", import.meta.url)), "utf8"),
);
const address = need("CONTRACT_ADDRESS");
const api = process.env.API_URL ?? "http://localhost:8787";
const chain = process.env.CHAIN === "baseSepolia" ? baseSepolia : foundry;
const transport = http(process.env.RPC_URL || undefined);
const account = privateKeyToAccount(need("NGO_KEY"));
const publicClient = createPublicClient({ chain, transport });
const wallet = createWalletClient({ account, chain, transport });

// 1x1 PNG; trailing bytes make each receipt hash unique.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const send = async (functionName, args, value) => {
  const hash = await wallet.writeContract({ address, abi, functionName, args, value });
  return publicClient.waitForTransactionReceipt({ hash });
};

const hops = [
  { label: "Field office", eth: "0.004", declared: 12000, receipt: 12000 },
  { label: "Vendor: rice supplier", eth: "0.003", declared: 8000, receipt: 8000 },
  { label: "Vendor: medical supplies", eth: "0.002", declared: 6500, receipt: 4200 },
];

const created = await send("createCampaign", ["Flood relief demo"]);
const campaignId = parseEventLogs({ abi, logs: created.logs, eventName: "CampaignCreated" })[0].args.campaignId;
await send("donate", [campaignId], parseEther("0.02"));
console.log(`Campaign ${campaignId} created and funded`);

for (const [i, hop] of hops.entries()) {
  const form = new FormData();
  form.append("file", new Blob([PNG, Buffer.from(`demo-${Date.now()}-${i}`)], { type: "image/png" }), "receipt.png");
  form.append("mockCents", String(hop.receipt));
  const upload = await fetch(`${api}/api/receipts`, { method: "POST", body: form });
  const receipt = await upload.json();
  if (!upload.ok) throw new Error(`Upload failed: ${receipt.error}`);

  const to = privateKeyToAddress(generatePrivateKey()); // throwaway recipient, key discarded
  const tx = await send("recordHop", [campaignId, to, parseEther(hop.eth), BigInt(hop.declared), receipt.receiptHash, hop.label]);
  const { hopId } = parseEventLogs({ abi, logs: tx.logs, eventName: "HopRecorded" })[0].args;

  const check = await fetch(`${api}/api/hops/${hopId}/check`, { method: "POST" });
  const result = await check.json();
  if (!check.ok) throw new Error(`Check failed: ${result.error}`);
  console.log(`Hop ${hopId} "${hop.label}": declared ${hop.declared}, receipt ${hop.receipt} -> ${result.status}`);
}
console.log("Seed complete");
