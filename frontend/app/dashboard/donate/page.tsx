"use client";

import { formatEther } from "viem";
import { Donate } from "../../../src/Forms";
import { useDapp } from "../../../src/dapp";
import { short } from "../../../src/utils";

export default function DonatePage() {
  const d = useDapp();
  const { campaign } = d;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Donate</h1>
        <p>Give test ETH to a campaign. Your donation is public, and so is every payment made from it.</p>
      </div>

      {!campaign ? (
        <div className="card empty">
          <h2>No campaign to donate to</h2>
          <p className="muted">Start one from the NGO desk first.</p>
        </div>
      ) : (
        <div className="grid">
          <section className="card">
            <span className="lab">Giving to</span>
            <h2>{campaign.name}</h2>
            <p className="muted small">Run by NGO {short(campaign.ngo)}</p>
            <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="stat"><span className="stat-value">{formatEther(campaign.raised)}</span><span className="stat-label">ETH raised</span></div>
              <div className="stat"><span className="stat-value">{formatEther(campaign.balance)}</span><span className="stat-label">ETH not yet spent</span></div>
            </div>
          </section>

          {d.wallet ? (
            <Donate onSubmit={d.donate} disabled={d.busy} />
          ) : (
            <section className="card">
              <h3>Connect a wallet to donate</h3>
              <p className="muted">Anyone can view campaigns without a wallet. Giving needs one.</p>
              <div><button onClick={d.connect} disabled={d.busy}>Connect wallet</button></div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
