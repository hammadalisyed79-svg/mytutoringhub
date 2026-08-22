"use client";

import { useState } from "react";
import Link from "next/link";
import { PasswordField } from "@/components/PasswordField";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send reset email");
        return;
      }
      setMsg(data.message || "Check your email for a reset link.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-stack">
      <p className="auth-legal" style={{ textAlign: "left", margin: 0 }}>
        If you usually tap <strong>Log in with Google</strong>, go back and use that button — there
        is no password until you set one in Settings or use the link we email you.
      </p>
      <form className="auth-form auth-form-flat" onSubmit={onSubmit}>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button className="btn btn-block btn-pill" type="submit" disabled={loading}>
          {loading ? "Sending…" : "Email me a reset link"}
        </button>
      </form>
      <Link href="/login" className="btn btn-secondary btn-block btn-pill">
        Back to log in
      </Link>
    </div>
  );
}
