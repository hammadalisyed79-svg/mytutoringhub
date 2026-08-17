"use client";

import { useState } from "react";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "TUTOR" | "STUDENT_AD" | "USER";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not send report");
      return;
    }
    setMsg("Report submitted. Thank you.");
    setOpen(false);
    setReason("");
  }

  if (!open) {
    return (
      <div>
        <button className="link-btn" type="button" onClick={() => setOpen(true)}>
          Report
        </button>
        {msg && <p className="success">{msg}</p>}
      </div>
    );
  }

  return (
    <form className="stack-form" onSubmit={submit} style={{ marginTop: "0.75rem" }}>
      <label>
        Why are you reporting this?
        <textarea
          required
          minLength={10}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-sm" type="submit">
          Submit report
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
