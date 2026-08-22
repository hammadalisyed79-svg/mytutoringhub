"use client";

import { useState } from "react";
import { ManualPlanActivationButton } from "@/components/ManualPlanActivationButton";
import type { SubscriptionPlan } from "@/lib/types";

export function SubscribeButton({
  plan,
  planLabel,
  label = "Subscribe securely",
  currency,
  billing,
  featured,
  complimentary,
  oneTime,
  paidCheckoutLive = true,
}: {
  plan: SubscriptionPlan;
  planLabel?: string;
  label?: string;
  currency?: string;
  billing?: "monthly" | "annual";
  featured?: boolean;
  complimentary?: boolean;
  oneTime?: boolean;
  paidCheckoutLive?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const displayName = planLabel || plan.replace(/_/g, " ");

  if (!paidCheckoutLive && !complimentary) {
    return (
      <ManualPlanActivationButton
        planName={displayName}
        label={label.startsWith("Pay with") ? `Email to activate ${displayName}` : label}
        featured={featured}
        note={
          oneTime
            ? "Card checkout opening soon · Email us after payment to activate boost"
            : "Card checkout opening soon · Manual activation available"
        }
      />
    );
  }

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
    else if (data.granted) window.location.href = "/dashboard?checkout=success";
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
          : oneTime
            ? "One-time payment · Receipt emailed · Boost extends if already active"
            : "Encrypted checkout · Receipt emailed · Cancel anytime before renewal"}
      </p>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
