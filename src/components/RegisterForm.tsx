"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { OAuthButtons, AuthDivider } from "@/components/OAuthButtons";

function RegisterFormInner({
  googleEnabled,
  microsoftEnabled,
}: {
  googleEnabled: boolean;
  microsoftEnabled: boolean;
}) {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "tutor" ? "TUTOR" : "STUDENT";
  const [role, setRole] = useState<"STUDENT" | "TUTOR">(defaultRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      role,
    };
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }
    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      window.location.href = "/login?verify=sent";
      return;
    }
    window.location.href = "/pricing?verify=sent";
  }

  return (
    <div className="auth-stack">
      <fieldset className="role-pick role-pick-cards">
        <legend>I am joining as a…</legend>
        <label className={`role-card ${role === "STUDENT" ? "is-selected" : ""}`}>
          <input
            type="radio"
            name="role-ui"
            value="STUDENT"
            checked={role === "STUDENT"}
            onChange={() => setRole("STUDENT")}
          />
          <strong>Student / parent</strong>
          <span className="muted">Find tutors and post requests</span>
        </label>
        <label className={`role-card ${role === "TUTOR" ? "is-selected" : ""}`}>
          <input
            type="radio"
            name="role-ui"
            value="TUTOR"
            checked={role === "TUTOR"}
            onChange={() => setRole("TUTOR")}
          />
          <strong>Tutor</strong>
          <span className="muted">List your profile and receive messages</span>
        </label>
      </fieldset>

      <form className="auth-form auth-form-flat" onSubmit={onSubmit}>
        <label>
          Full name
          <input name="name" required minLength={2} autoComplete="name" placeholder="Your name" />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@gmail.com, you@hotmail.com…"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-block" type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      {(googleEnabled || microsoftEnabled) && (
        <>
          <AuthDivider />
          <OAuthButtons
            intent="register"
            role={role}
            disabled={loading}
            googleEnabled={googleEnabled}
            microsoftEnabled={microsoftEnabled}
          />
        </>
      )}
      <p className="auth-footnote muted">
        Gmail, Hotmail, Outlook, Yahoo, and other addresses are welcome. We send your confirmation
        from admin@mytutoringhub.com.
      </p>
    </div>
  );
}

export function RegisterForm({
  googleEnabled,
  microsoftEnabled,
}: {
  googleEnabled: boolean;
  microsoftEnabled: boolean;
}) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <RegisterFormInner googleEnabled={googleEnabled} microsoftEnabled={microsoftEnabled} />
    </Suspense>
  );
}
