"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { OAuthButtons } from "@/components/OAuthButtons";
import { PasswordField } from "@/components/PasswordField";

export function LoginForm({
  googleEnabled = true,
  microsoftEnabled = false,
  onSwitchToRegister,
}: {
  googleEnabled?: boolean;
  microsoftEnabled?: boolean;
  onSwitchToRegister?: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")).trim().toLowerCase(),
      password: String(fd.get("password")),
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      setError(
        "Invalid email or password. Gmail, Hotmail, Outlook, Yahoo, and other mailboxes all work here.",
      );
      return;
    }
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json().catch(() => null);
    if (session?.user?.onboardingComplete === false) {
      window.location.href = "/register/complete";
      return;
    }
    window.location.href = session?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
  }

  return (
    <div className="auth-stack">
      <OAuthButtons
        intent="login"
        disabled={loading}
        googleEnabled={googleEnabled}
        microsoftEnabled={microsoftEnabled}
      />
      <form className="auth-form auth-form-flat" onSubmit={onSubmit}>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="user@example.com"
          />
        </label>
        <label>
          Password
          <PasswordField autoComplete="current-password" />
        </label>
        <p className="auth-forgot">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-block btn-pill" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="auth-switch">
        Don&apos;t have an account?{" "}
        {onSwitchToRegister ? (
          <button type="button" className="auth-text-link" onClick={onSwitchToRegister}>
            Sign up
          </button>
        ) : (
          <Link href="/register">Sign up</Link>
        )}
      </p>
      <p className="auth-legal">
        By clicking Log in you agree to the{" "}
        <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
