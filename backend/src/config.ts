import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";

// Network and contract live in shared/network.json so the backend and frontend always agree.
const network = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../shared/network.json", import.meta.url)), "utf8"),
) as { chainId: number; rpcUrl: string; contractAddress: Address };

const chain = (process.env.CHAIN ?? "baseSepolia") as "local" | "baseSepolia";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 8787),
  // Comma-separated list of allowed browser origins.
  frontendOrigins: (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((o) => o.trim()),
  chain,
  rpcUrl: process.env.RPC_URL || (chain === "baseSepolia" ? network.rpcUrl : undefined),
  contractAddress: (process.env.CONTRACT_ADDRESS ?? network.contractAddress) as Address,
  verifierPrivateKey: required("VERIFIER_PRIVATE_KEY") as Hex,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
  maxUploadBytes: 5 * 1024 * 1024,
};
