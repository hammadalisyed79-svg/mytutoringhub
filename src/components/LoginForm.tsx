"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { OAuthButtons } from "@/components/OAuthButtons";
import { PasswordField } from "@/components/PasswordField";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import type { LoginHint } from "@/app/api/auth/login-hint/route";
import { safeReturnPath } from "@/lib/safe-return-url";

const VERIFY_FIRST_MESSAGE =
  "Verify your email before signing in. Open the confirmation link we sent you, then try again.";

export function LoginForm({
  googleEnabled = true,
  microsoftEnabled = false,
  onSwitchToRegister,
  initialEmail = "",
  showVerifyPrompt = false,
  nextPath,
}: {
  googleEnabled?: boolean;
  microsoftEnabled?: boolean;
  onSwitchToRegister?: () => void;
  initialEmail?: string;
  /** Show the verify-first panel immediately (e.g. after signup). */
  showVerifyPrompt?: boolean;
  /** Safe relative path after successful login (from ?next= or ?callbackUrl=). */
  nextPath?: string;
}) {
  const [error, setError] = useState(showVerifyPrompt ? VERIFY_FIRST_MESSAGE : "");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(showVerifyPrompt);
  const [emailValue, setEmailValue] = useState(initialEmail);
  const returnTo = safeReturnPath(nextPath, "/dashboard");

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

  function showUnverified(email: string) {
    setNeedsVerification(true);
    setEmailValue(email);
    setError(VERIFY_FIRST_MESSAGE);
    setHint("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setHint("");
    setNeedsVerification(false);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim().toLowerCase();
    const password = String(fd.get("password"));
    setEmailValue(email);

    const loginHint = await fetchLoginHint(email);
    if (loginHint?.suspended) {
      setError(loginHint.message || "This account is suspended.");
      setLoading(false);
      return;
    }

    if (loginHint?.emailVerified === false) {
      showUnverified(email);
      setLoading(false);
      return;
    }

    if (loginHint?.message) {
      setHint(loginHint.message);
    }

    if (loginHint?.loginMethod === "oauth_only") {
      setError(
        "Use Google or Microsoft sign-in for this account, or set a password via Forgot password.",
      );
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
      if (res.code === "email_not_verified") {
        showUnverified(email);
        return;
      }
      if (loginHint?.loginMethod === "password") {
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
      window.location.href = `/register/complete?next=${encodeURIComponent(returnTo)}`;
      return;
    }
    if (session?.user?.role === "ADMIN" && returnTo === "/dashboard") {
      window.location.href = "/admin";
      return;
    }
    window.location.href = returnTo;
  }

  async function onEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value.trim().toLowerCase();
    if (!email.includes("@")) return;
    setEmailValue(email);
    const loginHint = await fetchLoginHint(email);
    if (loginHint?.emailVerified === false) {
      showUnverified(email);
      return;
    }
    if (loginHint?.message) setHint(loginHint.message);
  }

  return (
    <div className="auth-stack">
      <OAuthButtons
        intent="login"
        disabled={loading}
        googleEnabled={googleEnabled}
        microsoftEnabled={microsoftEnabled}
        callbackUrl={returnTo}
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
            defaultValue={initialEmail}
            onBlur={onEmailBlur}
            onChange={(e) => setEmailValue(e.target.value.trim().toLowerCase())}
          />
        </label>
        <label>
          Password
          <PasswordField autoComplete="current-password" />
        </label>
        <p className="auth-forgot">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
        {hint && !error && !needsVerification && (
          <p className="auth-hint muted" role="status">
            {hint}
          </p>
        )}
        {needsVerification ? (
          <div className="auth-verify-panel" role="alert">
            <strong>Verify your email to continue</strong>
            <p className="muted">
              We sent a confirmation link to{" "}
              <strong>{emailValue || "your inbox"}</strong>. Open that email, confirm your
              address, then log in here. Check junk and promotions if you do not see it.
            </p>
            <ResendVerificationButton email={emailValue || undefined} />
          </div>
        ) : error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
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
