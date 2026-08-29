"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export function BecomeTutorForm() {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/become-tutor", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Could not switch to a tutor account");
      }
      // Push role into the JWT immediately so /dashboard/tutor does not bounce back.
      await update({ role: "TUTOR", onboardingComplete: true });
      window.location.assign(
        (data as { redirect?: string }).redirect || "/dashboard/tutor?tab=profile",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Setting up your tutor profile…" : "Add tutor profile to this account"}
      </button>
    </form>
  );
}
