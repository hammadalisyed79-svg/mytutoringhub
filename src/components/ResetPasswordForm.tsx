"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="auth-stack">
        <p className="form-error">This reset link is missing or invalid.</p>
        <Link href="/forgot-password" className="btn btn-block btn-pill">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password?action=reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save password");
        return;
      }
      setMsg(data.message || "Password saved.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-stack">
      <form className="auth-form auth-form-flat" onSubmit={onSubmit}>
        <label>
          New password
          <PasswordField
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirm password
          <PasswordField
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {msg && (
          <>
            <p className="success">{msg}</p>
            <Link href="/login" className="btn btn-block btn-pill">
              Log in now
            </Link>
          </>
        )}
        {!msg && (
          <button className="btn btn-block btn-pill" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save password"}
          </button>
        )}
      </form>
    </div>
  );
}
