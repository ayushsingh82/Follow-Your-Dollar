"use client";

import { useState } from "react";
import { isAddress } from "viem";

export function CreateCampaign({ onSubmit, disabled }) {
  const [name, setName] = useState("");
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name.trim());
        setName("");
      }}
    >
      <h3>Start a campaign (NGO)</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Flood relief" maxLength={80} required aria-label="Campaign name" />
      <button disabled={disabled || !name.trim()}>Create campaign</button>
    </form>
  );
}

export function Donate({ onSubmit, disabled }) {
  const [amount, setAmount] = useState("0.01");
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(amount);
      }}
    >
      <h3>Donate (test ETH)</h3>
      <input type="number" min="0" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} required aria-label="Amount in ETH" />
      <button disabled={disabled || !(Number(amount) > 0)}>Donate</button>
    </form>
  );
}

export function RecordHop({ onSubmit, disabled, mock }) {
  const [to, setTo] = useState("");
  const [amountEth, setAmountEth] = useState("0.005");
  const [declared, setDeclared] = useState("50");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState(null);
  const [mockCents, setMockCents] = useState("");

  const problems = [];
  if (to && !isAddress(to)) problems.push("Recipient is not a valid address");
  const valid =
    isAddress(to) && Number(amountEth) > 0 && Number(declared) >= 0 && file && (!mock || mockCents !== "");

  return (
    <form
      className="card wide"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ to, amountEth, declared: Number(declared), label, file, mockCents });
      }}
    >
      <h3>Pay a vendor or field office, with a receipt (NGO)</h3>
      <p className="muted small">The funds are held in escrow and released only if the receipt matches the declared spend.</p>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient address 0x…" required aria-label="Recipient address" />
      {problems.map((p) => <p key={p} className="field-error">{p}</p>)}
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Vendor: rice supplier" maxLength={80} aria-label="Label" />
      <div className="row">
        <label>Amount (ETH)<input type="number" min="0" step="0.001" value={amountEth} onChange={(e) => setAmountEth(e.target.value)} /></label>
        <label>Spend declared (in receipt currency)<input type="number" min="0" step="0.01" value={declared} onChange={(e) => setDeclared(e.target.value)} /></label>
      </div>
      <label>
        Receipt (image or PDF, up to 5 MB)
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0] ?? null)} />
      </label>
      {mock && (
        <label>
          Demo mode: no AI key is set, so type the receipt total in cents
          <input type="number" min="0" step="1" value={mockCents} onChange={(e) => setMockCents(e.target.value)} />
        </label>
      )}
      <button disabled={disabled || !valid}>Send into escrow and check receipt</button>
    </form>
  );
}
