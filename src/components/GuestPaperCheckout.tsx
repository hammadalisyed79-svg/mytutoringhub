"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function GuestPaperCheckout({
  catalogKey,
  feeLabel,
}: {
  catalogKey: string;
  feeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const actionLabel = `View / Download · ${feeLabel}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/past-papers/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogKey, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = data as { error?: string; message?: string };
        throw new Error(err.message || err.error || "Could not start checkout");
      }
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="paper-buy paper-buy-guest">
        <button className="btn btn-sm" type="button" onClick={() => setOpen(true)}>
          {actionLabel}
        </button>
        <p className="muted paper-buy-note">
          No account needed — pay with card.{" "}
          <Link href="/login">Sign in</Link> for free Student Pass downloads.
        </p>
      </div>
    );
  }

  return (
    <form className="paper-buy paper-buy-guest stack-form" onSubmit={submit}>
      <label>
        Email for receipt &amp; download link
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <div className="hero-ctas" style={{ flexWrap: "wrap" }}>
        <button className="btn btn-sm" type="submit" disabled={busy}>
          {busy ? "Opening payment…" : `Pay ${feeLabel}`}
        </button>
        <button className="btn btn-sm btn-secondary" type="button" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <p className="muted paper-buy-note">
        Secure checkout via Safepay. We email your watermarked PDF link after payment.
      </p>
    </form>
  );
}
