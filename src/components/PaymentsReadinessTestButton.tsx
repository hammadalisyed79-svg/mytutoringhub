"use client";

import { useState } from "react";

export function PaymentsReadinessTestButton() {
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function testConnection() {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/safepay/ping");
      const data = await res.json();
      if (data.ok) {
        setResult(data.message || "Safepay connection verified.");
      } else {
        setResult(data.message || "Connection failed");
      }
    } catch {
      setResult("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="payments-readiness-test">
      <p className="muted" style={{ margin: "1rem 0 0.5rem" }}>
        After updating Vercel env vars, verify Safepay accepts your keys.
      </p>
      <button type="button" className="btn btn-sm" onClick={testConnection} disabled={busy}>
        {busy ? "Testing…" : "Test Safepay connection"}
      </button>
      {result && (
        <p className={result.includes("verified") || result.includes("live") ? "success" : "form-error"}>
          {result}
        </p>
      )}
    </div>
  );
}
