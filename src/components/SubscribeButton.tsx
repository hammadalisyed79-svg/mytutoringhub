"use client";

import { useState } from "react";
import { ManualPlanActivationButton } from "@/components/ManualPlanActivationButton";
import { manualActivationCtaLabel, manualActivationNote } from "@/lib/payments-status";
import type { SubscriptionPlan } from "@/lib/types";
import { fireConversionEvent } from "@/components/ConversionBeacon";
import { checkoutStartedEventForPlan } from "@/lib/analytics-conversions";

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
        plan={plan}
        planName={displayName}
        label={label.startsWith("Pay with") ? manualActivationCtaLabel(displayName) : label}
        featured={featured}
        note={manualActivationNote(oneTime)}
        oneTime={oneTime}
        subjectProfileId={subjectProfileId}
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

    const data = (await res.json()) as {
      error?: string;
      url?: string;
      granted?: boolean;
      complimentary?: boolean;
      plan?: string;
      billing?: string;
      currency?: string;
      amount?: number;
      tracker?: string;
    };
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not start checkout");
      return;
    }

    // Checkout started ≠ purchase. Fire only after host accepts the session.
    const checkoutEvent = checkoutStartedEventForPlan(data.plan || plan);
    if (checkoutEvent && (data.url || data.granted)) {
      fireConversionEvent(
        checkoutEvent,
        {
          plan: data.plan || plan,
          billing_period: data.billing || billing || "monthly",
          currency: data.currency || currency || "PKR",
          payment_source: data.complimentary ? "complimentary" : "safepay",
        },
        `checkout_${data.tracker || data.plan || plan}_${Date.now()}`,
      );
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
            ? "Activating complimentary offer…"
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
