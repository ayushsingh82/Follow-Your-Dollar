import { createPublicClient, createWalletClient, custom, http } from "viem";
import type { Abi, Address, Hash, WalletClient } from "viem";
import { baseSepolia, foundry } from "viem/chains";
import abiJson from "../../shared/DonationTrail.abi.json";

export const chain = process.env.NEXT_PUBLIC_CHAIN === "baseSepolia" ? baseSepolia : foundry;
export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address; // empty when unset; App checks before use
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
export const abi = abiJson as Abi;

export const publicClient = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
});

export const STATUS = ["Pending", "Verified", "Flagged", "Approved", "Rejected"] as const;
export type HopStatus = (typeof STATUS)[number];

export interface Campaign {
  id: bigint;
  name: string;
  ngo: Address;
  balance: bigint;
  raised: bigint;
}

export interface Hop {
  hopId: bigint;
  to: Address;
  amount: bigint;
  declaredCents: bigint;
  extractedCents: bigint;
  receiptHash: Hash;
  label: string;
  status: HopStatus;
  timestamp: bigint;
}

export interface Wallet {
  walletClient: WalletClient;
  account: Address;
}

// The wallet provider injected by MetaMask and similar extensions.
declare global {
  interface Window {
    ethereum?: Parameters<typeof custom>[0];
  }
}

export async function connectWallet(): Promise<Wallet> {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask or another EVM wallet.");
  const walletClient = createWalletClient({ chain, transport: custom(window.ethereum) });
  const [account] = await walletClient.requestAddresses();
  try {
    await walletClient.switchChain({ id: chain.id });
  } catch {
    await walletClient.addChain({ chain });
    await walletClient.switchChain({ id: chain.id });
  }
  return { walletClient, account };
}

export const loadVerifier = () =>
  publicClient.readContract({ address: contractAddress, abi, functionName: "verifier" }) as Promise<Address>;

export async function loadCampaigns(): Promise<Campaign[]> {
  const count = Number(await publicClient.readContract({ address: contractAddress, abi, functionName: "campaignCount" }));
  const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
  const rows = await Promise.all(
    ids.map(async (id) => {
      const [name, ngo, balance, raised] = (await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "campaigns",
        args: [id],
      })) as readonly [string, Address, bigint, bigint];
      return { id, name, ngo, balance, raised };
    }),
  );
  return rows;
}

export async function loadHops(campaignId: bigint): Promise<Hop[]> {
  const hopIds = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "getCampaignHops",
    args: [campaignId],
  })) as readonly bigint[];
  return Promise.all(
    hopIds.map(async (hopId) => {
      const [, to, amount, declaredCents, extractedCents, receiptHash, label, status, timestamp] =
        (await publicClient.readContract({ address: contractAddress, abi, functionName: "hops", args: [hopId] })) as readonly [bigint, Address, bigint, bigint, bigint, Hash, string, number, bigint];
      return { hopId, to, amount, declaredCents, extractedCents, receiptHash, label, status: STATUS[status], timestamp };
    }),
  );
}
