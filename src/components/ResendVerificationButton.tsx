"use client";

import { useState } from "react";

export function ResendVerificationButton({ email }: { email?: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function resend() {
    setLoading(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Could not send verification email");
      return;
    }
    if (data.alreadyVerified) {
      setMsg("Your email is already verified.");
      return;
    }
    const to = (data as { to?: string }).to || email;
    setMsg(
      to
        ? `Sent to ${to} from admin@mytutoringhub.com. Check inbox, junk, and promotions.`
        : "Verification email sent. Check inbox, junk, and promotions.",
    );
  }

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
      <button className="btn btn-sm" type="button" onClick={resend} disabled={loading}>
        {loading ? "Sending…" : "Resend verification email"}
      </button>
      {msg && <span className="success">{msg}</span>}
      {error && <span className="form-error">{error}</span>}
    </span>
  );
}
