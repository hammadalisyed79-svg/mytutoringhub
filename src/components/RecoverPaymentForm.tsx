"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RecoverPaymentForm() {
  const router = useRouter();
  const [tracker, setTracker] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/safepay/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracker }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not recover payment");
      return;
    }
    router.push(`/receipt/${data.receiptId}`);
  }

  return (
    <form className="stack-form" onSubmit={submit} style={{ marginTop: "1rem" }}>
      <label>
        Already paid on Safepay? Paste the tracker or checkout URL
        <input
          value={tracker}
          onChange={(e) => setTracker(e.target.value)}
          placeholder="track_… or https://sandbox.api.getsafepay.com/…tracker=track_…"
          required
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-secondary btn-sm" type="submit" disabled={busy}>
        {busy ? "Checking…" : "Show my slip"}
      </button>
    </form>
  );
}
