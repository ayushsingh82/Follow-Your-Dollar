"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { parseEther, parseEventLogs } from "viem";
import type { HopInput } from "./Forms";
import {
  abi,
  apiUrl,
  chain,
  connectWallet,
  contractAddress,
  loadCampaigns,
  loadHops,
  loadVerifier,
  publicClient,
} from "./chain";
import type { Campaign, Hop, Wallet } from "./chain";
import { cents, isReleased, sameAddress } from "./utils";

type Message = { kind: "info" | "ok" | "error"; text: string };

export interface TxRecord {
  label: string;
  hash: `0x${string}`;
  at: number;
  state: "pending" | "confirmed";
}

const TX_LABEL: Record<string, string> = {
  createCampaign: "Create campaign",
  donate: "Donate",
  recordHop: "Pay into escrow",
  reviewHop: "Review decision",
  reclaim: "Reclaim funds",
};

interface Dapp {
  configured: boolean;
  wallet: Wallet | null;
  campaigns: Campaign[];
  campaign: Campaign | undefined;
  hops: Hop[];
  selectedHop: Hop | null;
  selectedHopId: bigint | null;
  verifier: string | null;
  aiMode: string | null;
  message: Message | null;
  txs: TxRecord[];
  busy: boolean;
  loading: boolean;
  isNgo: boolean;
  isReviewer: boolean;
  role: "Reviewer" | "NGO" | "Donor" | null;
  selectCampaign: (id: bigint) => void;
  selectHop: (id: bigint | null) => void;
  connect: () => void;
  createCampaign: (name: string) => void;
  donate: (amountEth: string) => void;
  reviewHop: (hopId: bigint, approve: boolean) => void;
  reclaim: (hopId: bigint) => void;
  sendHop: (input: HopInput) => void;
}

const DappContext = createContext<Dapp | null>(null);

export function useDapp(): Dapp {
  const ctx = useContext(DappContext);
  if (!ctx) throw new Error("useDapp must be used inside DappProvider");
  return ctx;
}

/** viem errors carry a friendlier shortMessage. */
const errorText = (e: unknown): string => {
  const err = e as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message ?? "Unknown error";
};

export function DappProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<bigint | null>(null);
  const [hops, setHops] = useState<Hop[]>([]);
  const [selectedHopId, setSelectedHopId] = useState<bigint | null>(null);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const configured = Boolean(contractAddress);

  const campaign = campaigns.find((c) => c.id === selected);
  const selectedHop = hops.find((h) => h.hopId === selectedHopId) ?? null;
  const isNgo = sameAddress(wallet?.account, campaign?.ngo);
  const isReviewer = sameAddress(wallet?.account, verifier);
  const role = isReviewer ? "Reviewer" : isNgo ? "NGO" : wallet ? "Donor" : null;

  const refresh = useCallback(async () => {
    const list = await loadCampaigns();
    setCampaigns(list);
    const id = selected ?? list[0]?.id ?? null;
    setSelected(id);
    setHops(id ? await loadHops(id) : []);
  }, [selected]);

  // ?hop=3 deep-links to a hop's details
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("hop");
    if (param && /^\d+$/.test(param)) setSelectedHopId(BigInt(param));
  }, []);

  // Load on mount and whenever the campaign changes, then poll so the map stays live.
  useEffect(() => {
    if (!configured) return;
    const load = () =>
      refresh()
        .catch((e) => setMessage({ kind: "error", text: errorText(e) }))
        .finally(() => setLoading(false));
    load();
    const timer = setInterval(() => refresh().catch(() => {}), 8000);
    return () => clearInterval(timer);
  }, [refresh, configured]);

  useEffect(() => {
    if (!configured) return;
    loadVerifier().then(setVerifier).catch(() => {});
    fetch(`${apiUrl}/api/health`)
      .then((r) => r.json())
      .then((h: { ai: string }) => setAiMode(h.ai))
      .catch(() => setAiMode("offline"));
  }, [configured]);

  // Wrap an action: show progress, catch errors, refresh afterwards.
  const run = async (fn: (progress: (text: string) => void) => Promise<string>) => {
    setBusy(true);
    setMessage(null);
    try {
      const text = await fn((progress) => setMessage({ kind: "info", text: progress }));
      setMessage({ kind: "ok", text });
      await refresh();
    } catch (e) {
      setMessage({ kind: "error", text: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const requireWallet = () => {
    if (!wallet) throw new Error("Connect your wallet first");
    return wallet;
  };

  const write = async (functionName: string, args: unknown[], value?: bigint) => {
    const { walletClient, account } = requireWallet();
    const hash = await walletClient.writeContract({ account, chain, address: contractAddress, abi, functionName, args, value });
    const label = TX_LABEL[functionName] ?? functionName;
    setTxs((prev) => [{ label, hash, at: Date.now(), state: "pending" as const }, ...prev]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    setTxs((prev) => prev.map((t) => (t.hash === hash ? { ...t, state: "confirmed" as const } : t)));
    return receipt;
  };

  const value: Dapp = {
    configured,
    wallet,
    campaigns,
    campaign,
    hops,
    selectedHop,
    selectedHopId,
    verifier,
    aiMode,
    message,
    txs,
    busy,
    loading,
    isNgo,
    isReviewer,
    role,

    selectCampaign: (id) => {
      setSelected(id);
      setSelectedHopId(null);
    },
    selectHop: setSelectedHopId,

    connect: () =>
      run(async () => {
        setWallet(await connectWallet());
        return "Wallet connected";
      }),

    createCampaign: (name) =>
      run(async (progress) => {
        progress("Confirm in your wallet…");
        await write("createCampaign", [name]);
        const list = await loadCampaigns();
        setSelected(list.at(-1)?.id ?? null); // jump to the newest campaign
        setSelectedHopId(null);
        return `Campaign "${name}" created`;
      }),

    donate: (amountEth) =>
      run(async (progress) => {
        progress("Confirm in your wallet…");
        await write("donate", [selected], parseEther(amountEth));
        return `Donated ${amountEth} ETH`;
      }),

    reviewHop: (hopId, approve) =>
      run(async (progress) => {
        progress("Confirm in your wallet…");
        await write("reviewHop", [hopId, approve]);
        return approve ? "Approved: funds released to the recipient" : "Rejected: funds returned to the campaign";
      }),

    reclaim: (hopId) =>
      run(async (progress) => {
        progress("Confirm in your wallet…");
        await write("reclaim", [hopId]);
        return "Funds reclaimed to the campaign";
      }),

    sendHop: ({ to, amountEth, declared, label, file, mockCents }) =>
      run(async (progress) => {
        progress("1/4 Reading the receipt…");
        const form = new FormData();
        form.append("file", file);
        if (mockCents) form.append("mockCents", mockCents);
        const upload = await fetch(`${apiUrl}/api/receipts`, { method: "POST", body: form });
        const receipt = await upload.json();
        if (!upload.ok) throw new Error(receipt.error);

        progress("2/4 Confirm the escrow transaction in your wallet…");
        const tx = await write("recordHop", [
          selected,
          to,
          parseEther(amountEth),
          BigInt(Math.round(declared * 100)),
          receipt.receiptHash,
          label,
        ]);
        const [log] = parseEventLogs({ abi, logs: tx.logs, eventName: "HopRecorded" }) as unknown as { args: { hopId: bigint } }[];

        progress("4/4 Checking the receipt on-chain…");
        const check = await fetch(`${apiUrl}/api/hops/${log.args.hopId}/check`, { method: "POST" });
        const result = await check.json();
        if (!check.ok) throw new Error(result.error);

        setSelectedHopId(log.args.hopId);
        const outcome = isReleased(result.status) ? "funds released" : "funds held for review";
        return `Receipt shows ${cents(receipt.totalCents)}, declared ${declared.toFixed(2)}: ${result.status}, ${outcome}`;
      }),
  };

  return <DappContext.Provider value={value}>{children}</DappContext.Provider>;
}
