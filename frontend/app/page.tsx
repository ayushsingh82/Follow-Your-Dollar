import Link from "next/link";
import { Logo } from "../src/Logo";
import network from "../../shared/network.json";

const contractUrl = `${network.explorer}/address/${network.contractAddress}`;
const shortAddr = `${network.contractAddress.slice(0, 6)}…${network.contractAddress.slice(-4)}`;

export default function Landing() {
  return (
    <>
      <header className="site-nav">
        <Link href="/" className="logo-row">
          <Logo size={56} />
          <span>Follow<br />Your Dollar</span>
        </Link>
        <nav className="links" aria-label="Site">
          <a className="l" href="#how">How it works</a>
          <Link className="btn" href="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <main>
        {/* hero */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="eyebrow">Web3 for Social Good · Tech Track</span>
              <h1>Every donated dollar, <em>traced</em> to a receipt.</h1>
              <p className="lead">
                Donors give to a campaign. The NGO pays vendors hop by hop, each with a receipt. AI reads the receipt, and a smart
                contract decides whether the money is released.
              </p>
              <p className="live">
                <span className="dot" /> Live on {network.name} ·{" "}
                <a href={contractUrl} target="_blank" rel="noreferrer">contract {shortAddr} ↗</a>
              </p>
              <div className="cta">
                <Link className="btn lg" href="/dashboard">Open the dashboard</Link>
                <a className="btn lg ghost" href="#how">See how it works</a>
              </div>
            </div>

            <div className="receipt-stage">
            <div className="receipt" aria-label="Example trail receipt">
              <div className="hd">FOLLOW YOUR DOLLAR<br />CAMPAIGN #1 / FLOOD RELIEF</div>
              <div className="ln"><span>Donors to NGO</span><span>$100</span></div>
              <div className="ln"><span>NGO to field office</span><span>$60</span></div>
              <div className="st ok">VERIFIED, RELEASED</div>
              <div className="ln"><span>Field office to vendor</span><span>$40</span></div>
              <div className="st bad">FLAGGED, HELD</div>
              <div className="ft">NOBODY EDITS THIS LATER</div>
            </div>
            </div>
          </div>
        </section>

        {/* problem */}
        <section className="band tint" id="problem">
          <div className="wrap">
            <span className="lab">The problem</span>
            <h2>Donors give. Then comes the silence.</h2>
            <div className="three">
              <div><span className="num">01</span><h3>Reports arrive late</h3><p>Months later, summarized into a few tidy numbers.</p></div>
              <div><span className="num">02</span><h3>The spender keeps the books</h3><p>The organization that spends the money also writes, and can edit, the story of it.</p></div>
              <div><span className="num">03</span><h3>Leaks stay invisible</h3><p>Auditors chase paper receipts after the fact. Small misuse slips through.</p></div>
            </div>
          </div>
        </section>

        {/* how it works */}
        <section className="band" id="how">
          <div className="wrap">
            <span className="lab">How it works</span>
            <h2>Escrow, read, decide, release.</h2>
            <div className="steps4">
              <div><span className="big">1</span><h3>Donate</h3><p>Donors fund an NGO campaign. Every donation is public.</p></div>
              <div><span className="big">2</span><h3>Pay onward</h3><p>The NGO pays a vendor and uploads the receipt. The funds go into escrow in the contract.</p></div>
              <div><span className="big">3</span><h3>AI reads</h3><p>Claude vision proposes the receipt total as schema-checked JSON. It never decides validity.</p></div>
              <div><span className="big">4</span><h3>Contract decides</h3><p>Is the receipt within 1% of the declared spend? That rule is on-chain code anyone can read.</p></div>
            </div>
            <div className="verdict">
              <div>
                <span className="stamp" style={{ color: "var(--ok)" }}>Match</span>
                <p>The contract pays the recipient. The hop turns green on the trail map.</p>
              </div>
              <div>
                <span className="stamp" style={{ color: "var(--bad)" }}>Mismatch</span>
                <p>The funds stay held. A reviewer approves them, or sends the money back to the campaign.</p>
              </div>
            </div>
          </div>
        </section>

        {/* why web3 */}
        <section className="band dark">
          <div className="wrap">
            <span className="lab">Why Web3, why AI</span>
            <h2>AI proposes. Code and the chain prove.</h2>
            <div className="three">
              <div><span className="num">THE MODEL</span><h3>Reads.</h3><p>Pulls the total off a messy receipt. A suggestion, nothing more.</p></div>
              <div><span className="num">THE CONTRACT</span><h3>Decides.</h3><p>The match rule is plain Solidity. No model, no back room.</p></div>
              <div><span className="num">THE CHAIN</span><h3>Remembers.</h3><p>Hops, receipt hashes and results are public. Even the NGO cannot edit them later.</p></div>
            </div>
          </div>
        </section>

        {/* product */}
        <section className="band">
          <div className="wrap">
            <span className="lab">The prototype</span>
            <h2>Working code, not a mock-up.</h2>
            <div className="facts-row">
              <div><b>25</b><span className="lab">contract tests</span></div>
              <div><b>6</b><span className="lab">backend tests</span></div>
              <div><b>5</b><span className="lab">hop states</span></div>
              <div><b>1</b><span className="lab">command to run the demo</span></div>
            </div>
            <p className="muted" style={{ marginTop: 18, maxWidth: 720 }}>
              A Solidity escrow contract, a TypeScript backend that reads receipts and submits the on-chain check, and this
              dashboard. Everything runs on a local chain with one command, or on Base Sepolia.
            </p>
          </div>
        </section>

        {/* trust */}
        <section className="band tint" id="trust">
          <div className="wrap">
            <span className="lab">Trust model</span>
            <h2>We say what the chain can&apos;t prove.</h2>
            <div className="limits">
              <div>
                <span className="lab">The chain proves</span>
                <p>A record was not changed after the fact: every hop, receipt hash and check result, public and permanent.</p>
              </div>
              <div>
                <span className="lab">The chain cannot prove</span>
                <p>That a receipt is genuine. That is why a mismatch goes to a human reviewer, and why a production version needs a quorum of reviewers. This is a testnet prototype and has not been audited.</p>
              </div>
            </div>
          </div>
        </section>

        {/* final cta */}
        <section className="final">
          <div className="wrap">
            <h2>Follow a dollar from donor to vendor.</h2>
            <Link className="btn lg" href="/dashboard">Open the dashboard</Link>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="wrap foot-grid">
          <div className="foot-brand">
            <Link href="/" className="logo-row">
              <Logo size={44} />
              <span>Follow<br />Your Dollar</span>
            </Link>
            <p>Every donated dollar, traced to a receipt. AI reads it, a smart contract decides, and the chain remembers.</p>
          </div>

          <nav aria-label="Product">
            <span className="lab">Product</span>
            <Link href="/dashboard">Overview</Link>
            <Link href="/dashboard/receipts">Receipts</Link>
            <Link href="/dashboard/activity">Activity</Link>
            <Link href="/dashboard/ngo">NGO desk</Link>
          </nav>

          <nav aria-label="Learn">
            <span className="lab">Learn</span>
            <a href="#problem">The problem</a>
            <a href="#how">How it works</a>
            <a href="#trust">Trust model</a>
          </nav>

          <div>
            <span className="lab">Built for</span>
            <p className="foot-note">Web3 for Social Good Hackathon 2026</p>
            <p className="foot-note">Tech Track</p>
            <a className="foot-link" href={contractUrl} target="_blank" rel="noreferrer">Contract on Basescan ↗</a>
          </div>
        </div>
        <div className="foot-bar">
          <div className="wrap">
            <span>© 2026 Follow Your Dollar</span>
            <span>Testnet prototype. Not audited. Do not use real funds.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
