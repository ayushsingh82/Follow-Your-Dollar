import { createPublicClient, createWalletClient, custom, http } from "viem";
import { baseSepolia, foundry } from "viem/chains";
import abi from "../../shared/DonationTrail.abi.json";

export const chain = process.env.NEXT_PUBLIC_CHAIN === "baseSepolia" ? baseSepolia : foundry;
export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
export { abi };

export const publicClient = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
});

export const STATUS = ["Pending", "Verified", "Flagged", "Approved", "Rejected"];

export async function connectWallet() {
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
  publicClient.readContract({ address: contractAddress, abi, functionName: "verifier" });

export async function loadCampaigns() {
  const count = Number(await publicClient.readContract({ address: contractAddress, abi, functionName: "campaignCount" }));
  const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
  const rows = await Promise.all(
    ids.map(async (id) => {
      const [name, ngo, balance, raised] = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "campaigns",
        args: [id],
      });
      return { id, name, ngo, balance, raised };
    }),
  );
  return rows;
}

export async function loadHops(campaignId) {
  const hopIds = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "getCampaignHops",
    args: [campaignId],
  });
  return Promise.all(
    hopIds.map(async (hopId) => {
      const [, to, amount, declaredCents, extractedCents, receiptHash, label, status, timestamp] =
        await publicClient.readContract({ address: contractAddress, abi, functionName: "hops", args: [hopId] });
      return { hopId, to, amount, declaredCents, extractedCents, receiptHash, label, status: STATUS[status], timestamp };
    }),
  );
}
