"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
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
      setError("Invalid email or password. If you are new, create an account first.");
      return;
    }
    // Hard navigation so session cookie is applied reliably
    window.location.href = "/dashboard";
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
