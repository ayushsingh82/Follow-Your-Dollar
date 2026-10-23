"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { chain } from "./chain";
import { useDapp } from "./dapp";
import { Logo } from "./Logo";
import { addressUrl, short, txUrl } from "./utils";
import { contractAddress } from "./chain";

const NAV = [
  { href: "/dashboard", label: "Overview", n: "01" },
  { href: "/dashboard/receipts", label: "Receipts", n: "02" },
  { href: "/dashboard/activity", label: "Activity", n: "03" },
  { href: "/dashboard/donate", label: "Donate", n: "04" },
  { href: "/dashboard/ngo", label: "NGO desk", n: "05" },
  { href: "/dashboard/review", label: "Review", n: "06" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const d = useDapp();
  const path = usePathname();
  const contractUrl = contractAddress ? addressUrl(contractAddress) : null;
  const flagged = d.hops.filter((h) => h.status === "Flagged").length;

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand">
          <Logo size={56} />
          <span>Follow<br />Your Dollar</span>
        </Link>

        <nav aria-label="Dashboard">
          {NAV.map((item) => {
            const active = item.href === "/dashboard" ? path === item.href : path.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
                <span className="nav-n">{item.n}</span>
                {item.label}
                {item.label === "Review" && flagged > 0 && <span className="badge">{flagged}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="wallet-card">
          {d.wallet ? (
            <>
              <span className="lab">{d.role ?? "Connected"}</span>
              <strong>{short(d.wallet.account)}</strong>
            </>
          ) : (
            <>
              <span className="lab">Not connected</span>
              <button onClick={d.connect} disabled={d.busy}>Connect wallet</button>
            </>
          )}
        </div>

        <div className="side-foot">
          <p className="lab">Network</p>
          <p className="side-line">{chain.id === 31337 ? "Local test chain" : chain.name}</p>
          <p className="lab">Receipt reader</p>
          <p className="side-line">AI: {d.aiMode ?? "…"}</p>
          {contractUrl && (
            <a className="side-line" href={contractUrl} target="_blank" rel="noreferrer">Contract on explorer</a>
          )}
          <Link href="/" className="side-line">Back to the site</Link>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="top-left">
            {d.campaigns.length > 0 && (
              <label className="picker">
                <span className="lab">Campaign</span>
                <select
                  value={d.campaign?.id.toString() ?? ""}
                  onChange={(e) => d.selectCampaign(BigInt(e.target.value))}
                  aria-label="Choose campaign"
                >
                  {d.campaigns.map((c) => (
                    <option key={c.id.toString()} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="top-right">
            {d.wallet ? (
              <span className="who">
                <span className="lab">{d.role ?? "Connected"}</span>
                {short(d.wallet.account)}
              </span>
            ) : (
              <button onClick={d.connect} disabled={d.busy}>Connect wallet</button>
            )}
          </div>
        </header>

        <main className="content">
          {!d.configured ? (
            <p className="banner error">
              Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local (see .env.example).
            </p>
          ) : (
            <>
              {d.message && (
                <p className={`banner ${d.message.kind}`} role="status">
                  {d.busy && <span className="spinner" aria-hidden="true" />}
                  {d.message.text}
                </p>
              )}
              {d.txs[0] && (
                <p className="txchip">
                  <span className="lab">Last transaction</span>
                  {d.txs[0].label} · {txUrl(d.txs[0].hash) ? <a href={txUrl(d.txs[0].hash)!} target="_blank" rel="noreferrer">{short(d.txs[0].hash)}</a> : <span className="mono">{short(d.txs[0].hash)}</span>} · {d.txs[0].state}
                </p>
              )}
              {children}
            </>
          )}
          <p className="foot">
            The chain proves the record was not changed. It cannot prove a receipt is genuine, so flagged payments go to a human reviewer.
            Testnet prototype, not audited.
          </p>
        </main>
      </div>
    </div>
  );
}
