"use client";

import { useState } from "react";

export function PastPaperBuyButton({
  catalogKey,
  available,
  owned,
  feeLabel,
  signedIn,
}: {
  catalogKey: string;
  available: boolean;
  owned: boolean;
  feeLabel: string;
  signedIn: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!available) {
    return (
      <span className="paper-soon muted">Coming soon</span>
    );
  }

  if (owned) {
    return (
      <a className="btn btn-sm" href={`/api/past-papers/download?key=${encodeURIComponent(catalogKey)}`}>
        Download
      </a>
    );
  }

  if (!signedIn) {
    return (
      <a className="btn btn-sm" href="/login">
        Sign in · {feeLabel}
      </a>
    );
  }

  async function buy() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/past-papers/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogKey }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Could not start checkout");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="paper-buy">
      <button className="btn btn-sm" type="button" onClick={buy} disabled={busy}>
        {busy ? "Opening…" : `View / Download · ${feeLabel}`}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
