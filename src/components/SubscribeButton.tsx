"use client";

import { useState } from "react";
import { ManualPlanActivationButton } from "@/components/ManualPlanActivationButton";
import { manualActivationCtaLabel, manualActivationNote } from "@/lib/payments-status";
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
  hubPointsBalance = 0,
  listPricePkr,
  subjectProfileId,
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
  hubPointsBalance?: number;
  listPricePkr?: number;
  /** Required for AD_BOOST / HIGHLIGHTED_AD — binds purchase to one listing. */
  subjectProfileId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useHubPoints, setUseHubPoints] = useState(hubPointsBalance > 0);
  const displayName = planLabel || plan.replace(/_/g, " ");

  if (!paidCheckoutLive && !complimentary) {
    return (
      <ManualPlanActivationButton
        planName={displayName}
        label={label.startsWith("Pay with") ? manualActivationCtaLabel(displayName) : label}
        featured={featured}
        note={manualActivationNote(oneTime)}
        oneTime={oneTime}
      />
    );
  }

  async function subscribe() {
    setLoading(true);
    setError("");

    const payload = {
      plan,
      currency,
      billing: billing ?? "monthly",
      useHubPoints: useHubPoints && hubPointsBalance > 0,
      ...(subjectProfileId ? { subjectProfileId } : {}),
    };

    let res = await fetch("/api/safepay/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 503) {
      res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, ...(subjectProfileId ? { subjectProfileId } : {}) }),
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
      {hubPointsBalance > 0 && listPricePkr && listPricePkr > 0 && !complimentary ? (
        <label className="points-checkout-toggle">
          <input
            type="checkbox"
            checked={useHubPoints}
            onChange={(e) => setUseHubPoints(e.target.checked)}
          />
          Apply Hub Points (up to 50% off)
        </label>
      ) : null}
      <button
        className={`btn btn-block ${featured || complimentary ? "" : "btn-secondary"}`}
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
            : "Encrypted checkout · Receipt emailed · Access lasts for the period you purchase (no auto-renew unless stated at checkout)"}
      </p>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
