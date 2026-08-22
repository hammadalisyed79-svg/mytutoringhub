"use client";

import { useState } from "react";

export function ResendReadinessTestButton() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function testConnection() {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/resend/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.message || "Test email sent.");
      } else {
        setResult(data.message || "Send failed");
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
        Verify Resend can send from admin@mytutoringhub.com (domain must be Verified in Resend).
      </p>
      <label className="stack-label">
        Send test to
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{ marginTop: "0.35rem" }}
        />
      </label>
      <button
        type="button"
        className="btn btn-sm"
        onClick={testConnection}
        disabled={busy || !email.trim()}
        style={{ marginTop: "0.5rem" }}
      >
        {busy ? "Sending…" : "Send test email"}
      </button>
      {result && (
        <p className={result.includes("sent") || result.includes("Test") ? "success" : "form-error"}>
          {result}
        </p>
      )}
    </div>
  );
}
