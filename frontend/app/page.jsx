"use client";

import dynamic from "next/dynamic";

// The dashboard reads the wallet, the URL and the chain in the browser, so it is not server-rendered.
const App = dynamic(() => import("../src/App.jsx"), {
  ssr: false,
  loading: () => <main className="page"><p className="muted">Loading…</p></main>,
});

export default function Page() {
  return <App />;
}
