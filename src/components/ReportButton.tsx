"use client";

import { useState } from "react";

export const REPORT_CATEGORIES = [
  { value: "HARASSMENT", label: "Harassment or abuse" },
  { value: "SCAM", label: "Scam or fraud" },
  { value: "SPAM", label: "Spam or unwanted contact" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "UNDERAGE_SAFETY", label: "Child / underage safety concern" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "OTHER", label: "Other" },
] as const;

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "TUTOR" | "STUDENT_AD" | "USER";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("OTHER");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, category, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not send report");
      return;
    }
    setMsg("Report submitted. Thank you — our team will review it.");
    setOpen(false);
    setReason("");
    setCategory("OTHER");
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
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        What happened?
        <textarea
          required
          minLength={10}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Briefly describe what happened (required for admin review)."
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

export function BlockUserButton({ userId, userName }: { userId: string; userName?: string }) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function block() {
    if (
      !confirm(
        `Block ${userName || "this user"}? You won’t be able to message each other. You can unblock later from messages settings.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedUserId: userId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Could not block user");
      return;
    }
    setMsg("User blocked.");
  }

  return (
    <div>
      <button className="link-btn" type="button" onClick={block} disabled={busy}>
        {busy ? "Blocking…" : "Block user"}
      </button>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
