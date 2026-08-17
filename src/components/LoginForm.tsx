"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleSignInButton, AuthDivider } from "@/components/GoogleSignInButton";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
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
        "Invalid email or password. If you signed up with Google, use Continue with Google instead.",
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
      {googleEnabled && (
        <>
          <GoogleSignInButton intent="login" disabled={loading} />
          <AuthDivider />
        </>
      )}
      <form className="auth-form auth-form-flat" onSubmit={onSubmit}>
        <label>
          Email address
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Your password"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-block" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="auth-footnote muted">
        We email you a sign-in confirmation for your security.
      </p>
    </div>
  );
}
