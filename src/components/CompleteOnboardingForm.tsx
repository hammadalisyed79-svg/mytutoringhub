"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export function CompleteOnboardingForm() {
  const { update } = useSession();
  const [role, setRole] = useState<"STUDENT" | "TUTOR">("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Could not save your account type");
      }
      await update({ role, onboardingComplete: true });
      window.location.href =
        role === "TUTOR"
          ? "/dashboard/tutor?tab=profile"
          : (data as { redirect?: string }).redirect || "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form className="auth-stack" onSubmit={submit}>
      <fieldset className="role-pick">
        <legend>Choose your account type</legend>
        <div className="role-pick-cards">
          <label className={`role-card ${role === "STUDENT" ? "is-selected" : ""}`}>
            <input
              type="radio"
              name="role"
              value="STUDENT"
              checked={role === "STUDENT"}
              onChange={() => setRole("STUDENT")}
            />
            <strong>Student / parent</strong>
            <span className="muted">Find tutors and post requests.</span>
          </label>
          <label className={`role-card ${role === "TUTOR" ? "is-selected" : ""}`}>
            <input
              type="radio"
              name="role"
              value="TUTOR"
              checked={role === "TUTOR"}
              onChange={() => setRole("TUTOR")}
            />
            <strong>Tutor</strong>
            <span className="muted">List your profile and get messages.</span>
          </label>
        </div>
      </fieldset>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-block" type="submit" disabled={loading}>
        {loading ? "Saving…" : "Continue to dashboard"}
      </button>
    </form>
  );
}
