"use client";

import { useState } from "react";

export function AdminResendMessageNotifyButton({ conversationId }: { conversationId: string }) {
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`/api/admin/messages/${conversationId}/notify`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setResult(data.message || "Email alert sent.");
      } else {
        setResult(data.message || data.error || "Send failed");
      }
    } catch {
      setResult("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button type="button" className="btn btn-sm btn-secondary" onClick={resend} disabled={busy}>
        {busy ? "Sending…" : "Resend email alert to recipient"}
      </button>
      {result && (
        <p className={result.includes("sent") ? "success" : "form-error"} style={{ marginTop: "0.5rem" }}>
          {result}
        </p>
      )}
    </div>
  );
}
