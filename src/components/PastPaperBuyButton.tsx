"use client";

import { useState } from "react";
import { GuestPaperCheckout } from "@/components/GuestPaperCheckout";

export function PastPaperBuyButton({
  catalogKey,
  available,
  owned,
  feeLabel,
  feePkr,
  signedIn,
  guestToken,
}: {
  catalogKey: string;
  available: boolean;
  owned: boolean;
  feeLabel: string;
  feePkr: number;
  signedIn: boolean;
  guestToken?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!available) {
    return <span className="paper-soon muted">Coming soon</span>;
  }

  const priceSuffix = feeLabel === "Free" ? "Free" : feeLabel;
  const actionLabel = `View / Download · ${priceSuffix}`;

  const downloadHref =
    guestToken && !signedIn
      ? `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}&token=${encodeURIComponent(guestToken)}`
      : `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}`;

  if (owned || (guestToken && !signedIn)) {
    return (
      <a className="btn btn-sm" href={downloadHref}>
        {actionLabel}
      </a>
    );
  }

  if (!signedIn) {
    if (feePkr > 0) {
      return <GuestPaperCheckout catalogKey={catalogKey} feeLabel={feeLabel} />;
    }
    return (
      <a className="btn btn-sm" href="/login">
        Sign in · {actionLabel}
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
      const err = data as { error?: string; message?: string };
      setError(err.message || err.error || "Could not start checkout");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="paper-buy">
      <button className="btn btn-sm" type="button" onClick={buy} disabled={busy}>
        {busy ? "Opening…" : actionLabel}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
