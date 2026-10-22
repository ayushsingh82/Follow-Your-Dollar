import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Abi, Address, Hash } from "viem";
import { baseSepolia, foundry } from "viem/chains";
import { config } from "./config.js";

const abi: Abi = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../shared/DonationTrail.abi.json", import.meta.url)), "utf8"),
);

const chain = config.chain === "baseSepolia" ? baseSepolia : foundry;
const transport = http(config.rpcUrl);
const account = privateKeyToAccount(config.verifierPrivateKey);

export const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

export const STATUS = ["Pending", "Verified", "Flagged", "Approved", "Rejected"] as const;
export type HopStatus = (typeof STATUS)[number];

export interface Hop {
  campaignId: bigint;
  to: Address;
  amount: bigint;
  declaredCents: bigint;
  extractedCents: bigint;
  receiptHash: Hash;
  label: string;
  status: HopStatus;
  timestamp: bigint;
}

export async function readHop(hopId: bigint | number | string): Promise<Hop> {
  const [campaignId, to, amount, declaredCents, extractedCents, receiptHash, label, status, timestamp] =
    (await publicClient.readContract({
      address: config.contractAddress,
      abi,
      functionName: "hops",
      args: [BigInt(hopId)],
    })) as readonly [bigint, Address, bigint, bigint, bigint, Hash, string, number, bigint];
  return {
    campaignId,
    to,
    amount,
    declaredCents,
    extractedCents,
    receiptHash,
    label,
    status: STATUS[status],
    timestamp,
  };
}

export async function submitCheck(hopId: bigint | number | string, extractedCents: number): Promise<Hash> {
  const txHash = await walletClient.writeContract({
    address: config.contractAddress,
    abi,
    functionName: "checkHop",
    args: [BigInt(hopId), BigInt(extractedCents)],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export const verifierAddress = account.address;
