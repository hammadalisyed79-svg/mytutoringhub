"use client";

import { useState } from "react";
import type { SubscriptionPlan } from "@/lib/types";

export function SubscribeButton({
  plan,
  label = "Subscribe securely",
  currency,
  billing,
  featured,
  complimentary,
}: {
  plan: SubscriptionPlan;
  label?: string;
  currency?: string;
  billing?: "monthly" | "annual";
  featured?: boolean;
  complimentary?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    setLoading(true);
    setError("");

    let res = await fetch("/api/safepay/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, currency, billing: billing ?? "monthly" }),
    });

    if (res.status === 503) {
      res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
    }

    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not start checkout");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="checkout-action">
      <button
        className={`btn btn-block ${featured ? "" : "btn-secondary"}`}
        type="button"
        onClick={subscribe}
        disabled={loading}
      >
        {loading
          ? complimentary
            ? "Activating complimentary listing…"
            : "Opening secure checkout…"
          : label}
      </button>
      <p className="checkout-trust muted">
        {complimentary
          ? "No payment required for this offer · Badges and boosts remain paid"
          : "Encrypted checkout · Receipt emailed · Cancel anytime before renewal"}
      </p>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
