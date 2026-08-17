"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function RegisterFormInner() {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "tutor" ? "TUTOR" : "STUDENT";
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
      role: String(fd.get("role")),
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
      window.location.href = "/login";
      return;
    }
    window.location.href = "/pricing?verify=sent";
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Full name
        <input name="name" required minLength={2} />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={6} />
      </label>
      <fieldset className="role-pick">
        <legend>I am a…</legend>
        <label className="radio">
          <input
            type="radio"
            name="role"
            value="STUDENT"
            defaultChecked={defaultRole === "STUDENT"}
          />
          Student / parent looking for a tutor
        </label>
        <label className="radio">
          <input type="radio" name="role" value="TUTOR" defaultChecked={defaultRole === "TUTOR"} />
          Tutor looking for students
        </label>
      </fieldset>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function RegisterForm() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <RegisterFormInner />
    </Suspense>
  );
}
