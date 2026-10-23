"use client";

import { CreateCampaign, RecordHop } from "../../../src/Forms";
import { useDapp } from "../../../src/dapp";
import { short } from "../../../src/utils";

export default function NgoDesk() {
  const d = useDapp();

  return (
    <div className="stack">
      <div className="page-head">
        <h1>NGO desk</h1>
        <p>Start a campaign, then pay vendors and field offices. Each payment needs a receipt and is held in escrow until it is checked.</p>
      </div>

      {!d.wallet ? (
        <section className="card">
          <h3>Connect your wallet</h3>
          <p className="muted">The NGO desk acts through the wallet that owns the campaign.</p>
          <div><button onClick={d.connect} disabled={d.busy}>Connect wallet</button></div>
        </section>
      ) : (
        <div className="grid">
          <CreateCampaign onSubmit={d.createCampaign} disabled={d.busy} />
          {d.campaign && d.isNgo && <RecordHop onSubmit={d.sendHop} disabled={d.busy} mock={d.aiMode === "mock"} />}
          {d.campaign && !d.isNgo && (
            <p className="card wide muted small">
              Only the campaign&apos;s NGO ({short(d.campaign.ngo)}) can make payments. Connect that wallet to try the NGO side.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
