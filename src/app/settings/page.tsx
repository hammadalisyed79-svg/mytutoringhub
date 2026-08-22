"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";

export default function SettingsPage() {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((u) => {
        if (u?.name) {
          setName(u.name);
          setPhone(u.phone || "");
          setEmail(u.email || "");
          setEmailVerified(Boolean(u.emailVerified));
          setHasPassword(Boolean(u.hasPassword));
          setOauthProviders(Array.isArray(u.oauthProviders) ? u.oauthProviders : []);
        }
      })
      .catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        ...(password ? { password } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    setName(data.name || name);
    setMsg("Settings saved.");
    setPassword("");
    if (password) setHasPassword(true);
    await update({ name: data.name });
    router.refresh();
  }

  async function deleteAccount() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    const res = await fetch("/api/settings", { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete account");
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Account settings</h1>
        <p className="muted">
          Update the name students and tutors see. Google sign-in can fill this on first login —
          you can change it anytime.{" "}
          <Link href="/settings/plan">Your plan</Link>
          {" · "}
          <Link href="/pricing">Pricing</Link>
        </p>
        <form className="stack-form" onSubmit={save}>
          <label>
            Email
            <input value={email} disabled />
          </label>
          {emailVerified === false && (
            <div className="panel" style={{ borderColor: "var(--brand)", background: "rgba(15, 90, 70, 0.06)" }}>
              <p style={{ marginTop: 0 }}>
                Your email is not verified yet. Messaging and ads stay locked until you confirm the
                link we sent. Student Pro is also required for the AI study assistant.
              </p>
              <ResendVerificationButton email={email} />
            </div>
          )}
          {emailVerified === true && <p className="success">Email verified.</p>}
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
            <span className="field-hint">
              Students see this on your listing. Google sign-in fills it from your Gmail profile; you
              can change it anytime.
            </span>
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            New password (optional)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder={hasPassword ? "Leave blank to keep current" : "At least 8 characters"}
            />
            {!hasPassword && oauthProviders.length > 0 && (
              <span className="field-hint">
                You signed in with {oauthProviders.includes("google") ? "Google" : "social login"}.
                Set a password here to log in with email next time.
              </span>
            )}
          </label>
          {error && <p className="form-error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
          <button className="btn" type="submit">
            Save settings
          </button>
        </form>
        <button
          className="btn btn-secondary"
          type="button"
          style={{ marginTop: "1.5rem" }}
          onClick={deleteAccount}
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
