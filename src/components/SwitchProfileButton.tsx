"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type TargetRole = "STUDENT" | "TUTOR";

export function SwitchProfileButton({
  target,
  label,
  className = "btn btn-secondary btn-sm",
  busyLabel,
}: {
  target: TargetRole;
  label: string;
  className?: string;
  busyLabel?: string;
}) {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function switchMode() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: target }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
        role?: TargetRole;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not switch profile");
      }
      await update({
        role: data.role || target,
        ...(target === "TUTOR" ? { onboardingComplete: true } : {}),
      });
      window.location.assign(
        data.redirect || (target === "TUTOR" ? "/dashboard/tutor" : "/dashboard/student"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <span className="switch-profile-wrap">
      <button
        type="button"
        className={className}
        disabled={loading}
        onClick={() => void switchMode()}
      >
        {loading ? busyLabel || "Switching…" : label}
      </button>
      {error ? <span className="form-error switch-profile-error">{error}</span> : null}
    </span>
  );
}
