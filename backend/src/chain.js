import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, foundry } from "viem/chains";
import { config } from "./config.js";

const abi = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../shared/DonationTrail.abi.json", import.meta.url)), "utf8"),
);

const chain = config.chain === "baseSepolia" ? baseSepolia : foundry;
const transport = http(config.rpcUrl);
const account = privateKeyToAccount(config.verifierPrivateKey);

export const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

export const STATUS = ["Pending", "Verified", "Flagged", "Approved", "Rejected"];

export async function readHop(hopId) {
  const [campaignId, to, amount, declaredCents, extractedCents, receiptHash, label, status, timestamp] =
    await publicClient.readContract({
      address: config.contractAddress,
      abi,
      functionName: "hops",
      args: [BigInt(hopId)],
    });
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

export async function submitCheck(hopId, extractedCents) {
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
