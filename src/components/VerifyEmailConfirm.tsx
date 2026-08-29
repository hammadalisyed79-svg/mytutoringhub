"use client";

import { useState } from "react";
import Link from "next/link";

export function VerifyEmailConfirm({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false);

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
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="token" value={token} />
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Confirming…" : "Confirm email address"}
        </button>
      </form>
      <p className="field-hint" style={{ marginTop: "1rem" }}>
        After confirming, you can log in. A short welcome email will follow.
      </p>
    </div>
  );
}
