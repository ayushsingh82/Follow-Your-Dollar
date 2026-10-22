"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther, parseEther, parseEventLogs } from "viem";
import { CreateCampaign, Donate, RecordHop } from "./Forms";
import type { HopInput } from "./Forms";
import HopDetail from "./HopDetail";
import TrailMap from "./TrailMap";
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
import { STATUS_INFO, addressUrl, cents, eth, isHeld, isReleased, sameAddress, short } from "./utils";

const STEPS: [string, string, string][] = [
  ["1", "Donors give", "Donations go into a campaign and are visible to everyone."],
  ["2", "NGO pays with a receipt", "Each payment is held in escrow with a receipt attached."],
  ["3", "The contract checks", "A matching receipt releases the money. A mismatch is held for review."],
];

/** viem errors carry a friendlier shortMessage. */
const errorText = (e: unknown): string => {
  const err = e as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message ?? "Unknown error";
};

export default function App() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<bigint | null>(null);
  const [hops, setHops] = useState<Hop[]>([]);
  // ?hop=3 deep-links to a hop's details
  const [selectedHopId, setSelectedHopId] = useState<bigint | null>(() => {
    const param = new URLSearchParams(window.location.search).get("hop");
    return param && /^\d+$/.test(param) ? BigInt(param) : null;
  });
  const [verifier, setVerifier] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "info" | "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Load on mount and whenever the campaign changes, then poll so the map stays live.
  useEffect(() => {
    if (!contractAddress) return;
    const load = () =>
      refresh()
        .catch((e) => setMessage({ kind: "error", text: errorText(e) }))
        .finally(() => setLoading(false));
    load();
    const timer = setInterval(() => refresh().catch(() => {}), 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!contractAddress) return;
    loadVerifier().then(setVerifier).catch(() => {});
    fetch(`${apiUrl}/api/health`)
      .then((r) => r.json())
      .then((h: { ai: string }) => setAiMode(h.ai))
      .catch(() => setAiMode("offline"));
  }, []);

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
    return publicClient.waitForTransactionReceipt({ hash });
  };

  const connect = () =>
    run(async () => {
      setWallet(await connectWallet());
      return "Wallet connected";
    });

  const createCampaign = (name: string) =>
    run(async (progress) => {
      progress("Confirm in your wallet…");
      await write("createCampaign", [name]);
      const list = await loadCampaigns();
      setSelected(list.at(-1)?.id ?? null); // jump to the newest campaign
      setSelectedHopId(null);
      return `Campaign "${name}" created`;
    });

  const donate = (amountEth: string) =>
    run(async (progress) => {
      progress("Confirm in your wallet…");
      await write("donate", [selected], parseEther(amountEth));
      return `Donated ${amountEth} ETH`;
    });

  const reviewHop = (hopId: bigint, approve: boolean) =>
    run(async (progress) => {
      progress("Confirm in your wallet…");
      await write("reviewHop", [hopId, approve]);
      return approve ? "Approved: funds released to the recipient" : "Rejected: funds returned to the campaign";
    });

  const reclaim = (hopId: bigint) =>
    run(async (progress) => {
      progress("Confirm in your wallet…");
      await write("reclaim", [hopId]);
      return "Funds reclaimed to the campaign";
    });

  const sendHop = ({ to, amountEth, declared, label, file, mockCents }: HopInput) =>
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
    });

  if (!contractAddress) {
    return (
      <main className="page">
        <h1>Follow Your Dollar</h1>
        <p className="banner error">Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local (see .env.example).</p>
      </main>
    );
  }

  const released = hops.filter((h) => isReleased(h.status)).reduce((s, h) => s + h.amount, 0n);
  const escrow = hops.filter((h) => isHeld(h.status)).reduce((s, h) => s + h.amount, 0n);
  const verifiedCount = hops.filter((h) => isReleased(h.status)).length;
  const flaggedCount = hops.filter((h) => h.status === "Flagged").length;
  const pendingCount = hops.filter((h) => h.status === "Pending").length;
  const contractUrl = addressUrl(contractAddress);

  return (
    <main className="page">
      <header className="top">
        <div>
          <h1>Follow Your Dollar</h1>
          <p className="tagline">Every donated dollar, traced to a receipt.</p>
        </div>
        <div className="top-actions">
          <span className="pill">{chain.id === 31337 ? "Local test chain" : chain.name}</span>
          <span className="pill" title="How receipts are read">AI: {aiMode ?? "…"}</span>
          {contractUrl && <a className="pill link" href={contractUrl} target="_blank" rel="noreferrer">Contract ↗</a>}
          {wallet ? (
            <span className="pill ok">{short(wallet.account)}{role ? ` · ${role}` : ""}</span>
          ) : (
            <button onClick={connect} disabled={busy}>Connect wallet</button>
          )}
        </div>
      </header>

      <ol className="steps" aria-label="How it works">
        {STEPS.map(([n, title, text]) => (
          <li key={n}>
            <span className="step-n">{n}</span>
            <div><strong>{title}</strong><p>{text}</p></div>
          </li>
        ))}
      </ol>

      {message && (
        <p className={`banner ${message.kind}`} role="status">
          {busy && <span className="spinner" aria-hidden="true" />}
          {message.text}
        </p>
      )}

      <section className="card">
        <div className="row between">
          <h2>Campaign</h2>
          {campaigns.length > 0 && (
            <select
              value={selected?.toString() ?? ""}
              onChange={(e) => { setSelected(BigInt(e.target.value)); setSelectedHopId(null); }}
              aria-label="Choose campaign"
            >
              {campaigns.map((c) => (
                <option key={c.id.toString()} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {loading && <p className="muted">Loading from the blockchain…</p>}

        {!loading && !campaign && (
          <div className="empty">
            <p><strong>No campaigns yet.</strong></p>
            <p className="muted">Connect a wallet and start one below to see its trail here.</p>
          </div>
        )}

        {campaign && (
          <>
            <p className="summary">
              {hops.length === 0
                ? "No payments yet. Every payment the NGO makes will appear here with its receipt."
                : `${verifiedCount} of ${hops.length} payment${hops.length === 1 ? "" : "s"} verified by receipt` +
                  (flaggedCount ? ` · ${flaggedCount} held for review` : "") +
                  (pendingCount ? ` · ${pendingCount} awaiting check` : "")}
            </p>
            <div className="stats">
              <Stat label="Raised" value={`${formatEther(campaign.raised)} ETH`} />
              <Stat label="Released" value={`${formatEther(released)} ETH`} />
              <Stat label="In escrow" value={`${formatEther(escrow)} ETH`} warn={escrow > 0n} />
              <Stat label="Not yet spent" value={`${formatEther(campaign.balance)} ETH`} />
            </div>
            <div className="trail-wrap">
              <TrailMap campaign={campaign} hops={hops} selectedHopId={selectedHopId} onSelect={setSelectedHopId} />
            </div>
            <p className="swipe-hint">Swipe the map sideways to see every payment →</p>
            <ul className="legend" aria-label="Legend">
              {Object.entries(STATUS_INFO).map(([status, info]) => (
                <li key={status} className={status.toLowerCase()}>{info.icon} {info.label}</li>
              ))}
              <li className="note">Moving lines = money released · dotted = held in escrow</li>
            </ul>
          </>
        )}
      </section>

      {selectedHop && (
        <HopDetail
          hop={selectedHop}
          isReviewer={isReviewer}
          isNgo={isNgo}
          busy={busy}
          onReview={reviewHop}
          onReclaim={reclaim}
        />
      )}

      {hops.length > 0 && (
        <section className="card">
          <h2>Receipts</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Recipient</th><th>Amount</th><th>Declared</th><th>Receipt shows</th><th>Status</th></tr>
              </thead>
              <tbody>
                {hops.map((h) => (
                  <tr
                    key={h.hopId.toString()}
                    className={h.hopId === selectedHopId ? "selected" : ""}
                    onClick={() => setSelectedHopId(h.hopId)}
                  >
                    <td>{h.hopId.toString()}</td>
                    <td>{h.label || short(h.to)}</td>
                    <td>{eth(h.amount)}</td>
                    <td>{cents(h.declaredCents)}</td>
                    <td>{h.status === "Pending" ? "—" : cents(h.extractedCents)}</td>
                    <td><span className={`tag ${h.status.toLowerCase()}`}>{STATUS_INFO[h.status].icon} {STATUS_INFO[h.status].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Select a row or a box on the map for details.</p>
        </section>
      )}

      {!wallet ? (
        <section className="card">
          <h2>Take part</h2>
          <p className="muted">Anyone can view campaigns. Connect a wallet to donate, start a campaign, or manage payments.</p>
          <div><button onClick={connect} disabled={busy}>Connect wallet</button></div>
        </section>
      ) : (
        <div className="grid">
          {campaign && <Donate onSubmit={donate} disabled={busy} />}
          <CreateCampaign onSubmit={createCampaign} disabled={busy} />
          {campaign && isNgo && <RecordHop onSubmit={sendHop} disabled={busy} mock={aiMode === "mock"} />}
          {campaign && !isNgo && (
            <p className="card wide muted small">
              Only the campaign's NGO ({short(campaign.ngo)}) can make payments. Connect that wallet to try the NGO side.
            </p>
          )}
        </div>
      )}

      <footer className="foot">
        <p>
          The chain proves the record was not changed. It cannot prove a receipt is genuine, so flagged payments go to a human reviewer.
          Testnet prototype, not audited.
        </p>
      </footer>
    </main>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`stat ${warn ? "warn" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
