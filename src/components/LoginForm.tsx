"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { OAuthButtons } from "@/components/OAuthButtons";
import { PasswordField } from "@/components/PasswordField";
import type { LoginHint } from "@/app/api/auth/login-hint/route";

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
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchLoginHint(email: string): Promise<LoginHint | null> {
    try {
      const res = await fetch("/api/auth/login-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return null;
      return (await res.json()) as LoginHint;
    } catch {
      return null;
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setHint("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim().toLowerCase();
    const password = String(fd.get("password"));

    const loginHint = await fetchLoginHint(email);
    if (loginHint?.message) {
      setHint(loginHint.message);
    }

    if (loginHint?.loginMethod === "oauth_only") {
      setError("Use Google or Microsoft sign-in for this account, or set a password via Forgot password.");
      setLoading(false);
      return;
    }

    if (loginHint && !loginHint.exists) {
      setError("No account found for this email. Sign up first.");
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      if (loginHint?.hasPassword) {
        setError("Incorrect password. Try again or use Forgot password.");
      } else {
        setError(
          "Invalid email or password. If you joined with Google, use Log in with Google above.",
        );
      }
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

  async function onEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value.trim().toLowerCase();
    if (!email.includes("@")) return;
    const loginHint = await fetchLoginHint(email);
    if (loginHint?.message) setHint(loginHint.message);
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
            onBlur={onEmailBlur}
          />
        </label>
        <label>
          Password
          <PasswordField autoComplete="current-password" />
        </label>
        <p className="auth-forgot">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
        {hint && !error && (
          <p className="auth-hint muted" role="status">
            {hint}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
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
