"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

function toRelativePath(redirectTo: string): string {
  try {
    const u = new URL(redirectTo, window.location.origin);
    if (u.origin !== window.location.origin) return "/login?verified=1";
    return `${u.pathname}${u.search}`;
  } catch {
    return redirectTo.startsWith("/") ? redirectTo : "/login?verified=1";
  }
}

export function VerifyEmailConfirm({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="panel auth-verify-panel">
        <h1 className="page-title">Link missing</h1>
        <p className="muted">
          This confirmation link is incomplete. Open the latest email from My Tutoring Hub, or
          request a new link from the login page.
        </p>
        <Link className="btn" href="/login?verify=invalid">
          Back to log in
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token }),
      });

      const data = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
      const next = toRelativePath(data?.redirectTo || "/login?verify=invalid");
      window.location.assign(next);
    } catch {
      setSubmitting(false);
      setError("Could not confirm right now. Check your connection and try again.");
    }
  }

  return (
    <div className="panel auth-verify-panel">
      <h1 className="page-title">Confirm your email</h1>
      <p className="muted">
        Click the button below to verify your address. This step protects your account from
        automated link scanners.
      </p>
      <form
        action="/api/auth/verify-email"
        method="post"
        onSubmit={onSubmit}
      >
        <input type="hidden" name="token" value={token} />
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Confirming…" : "Confirm email address"}
        </button>
      </form>
      {error ? (
        <p className="form-error" style={{ marginTop: "0.75rem" }} role="alert">
          {error}
        </p>
      ) : null}
      <p className="field-hint" style={{ marginTop: "1rem" }}>
        After confirming, you can log in. A short welcome email will follow.
      </p>
    </div>
  );
}
