"use client";

import { useState } from "react";

export function RequestReviewButton({
  studentId,
  tutorProfileId,
}: {
  studentId: string;
  tutorProfileId: string;
}) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/review-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, tutorProfileId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send request");
      return;
    }
    setMsg("Review request sent.");
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={request} disabled={busy}>
        {busy ? "Sending…" : "Request a review"}
      </button>
      {msg && <p className="success" style={{ marginTop: "0.5rem" }}>{msg}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
