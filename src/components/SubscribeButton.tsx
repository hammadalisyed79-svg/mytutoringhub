"use client";

import { useState } from "react";
import { ManualPlanActivationButton } from "@/components/ManualPlanActivationButton";
import { manualActivationCtaLabel, manualActivationNote } from "@/lib/payments-status";
import type { SubscriptionPlan } from "@/lib/types";
import { fireConversionEvent } from "@/components/ConversionBeacon";
import { checkoutStartedEventForPlan } from "@/lib/analytics-conversions";
import type { PurchaseTrigger } from "@/lib/purchase-context";

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
  returnUrl,
  trigger,
  sourcePage,
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
  /** After payment, resume this same-origin path. */
  returnUrl?: string;
  trigger?: PurchaseTrigger;
  sourcePage?: string;
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

    fireConversionEvent(
      "purchase_intent",
      {
        plan,
        billing_period: billing || (oneTime ? "once" : "monthly"),
        currency: currency || "PKR",
        trigger: trigger || undefined,
        source_page: sourcePage || undefined,
      },
      `intent_${plan}_${Date.now()}`,
    );

    const payload = {
      plan,
      currency,
      billing: billing ?? "monthly",
      useHubPoints: useHubPoints && hubPointsBalance > 0,
      ...(subjectProfileId ? { subjectProfileId } : {}),
      ...(returnUrl ? { returnUrl } : {}),
      ...(trigger ? { trigger } : {}),
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
        body: JSON.stringify({
          plan,
          ...(subjectProfileId ? { subjectProfileId } : {}),
          ...(returnUrl ? { returnUrl } : {}),
        }),
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
      alreadyActive?: boolean;
      manageUrl?: string;
    };
    setLoading(false);
    if (!res.ok) {
      if (res.status === 409 && data.manageUrl) {
        setError(data.error || "You already have this plan.");
        return;
      }
      setError(data.error || "Could not start checkout");
      return;
    }

    const checkoutEvent = checkoutStartedEventForPlan(data.plan || plan);
    if (checkoutEvent && (data.url || data.granted)) {
      fireConversionEvent(
        checkoutEvent,
        {
          plan: data.plan || plan,
          billing_period: data.billing || billing || "monthly",
          currency: data.currency || currency || "PKR",
          payment_source: data.complimentary ? "complimentary" : "safepay",
          trigger: trigger || undefined,
          source_page: sourcePage || undefined,
        },
        `checkout_${data.tracker || data.plan || plan}_${Date.now()}`,
      );
    }

    if (data.url) {
      fireConversionEvent(
        "checkout_redirected",
        { plan: data.plan || plan, trigger: trigger || undefined },
        `redirect_${data.tracker || plan}_${Date.now()}`,
      );
      window.location.href = data.url;
    } else if (data.granted) {
      const dest =
        returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")
          ? returnUrl
          : "/dashboard?checkout=success";
      window.location.href = dest.includes("?")
        ? `${dest}&checkout=success&plan=${encodeURIComponent(plan)}`
        : `${dest}?checkout=success&plan=${encodeURIComponent(plan)}`;
    }
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
          ? "No payment required for Launch offer · Listing Boost and Priority Verification remain paid"
          : oneTime
            ? "Secure checkout with Safepay · One-time payment · Receipt emailed"
            : "Secure checkout with Safepay · Access lasts for the period you purchase (no auto-renew unless stated at checkout)"}
      </p>
      {error && (
        <p className="form-error">
          {error}
          {error.toLowerCase().includes("already") ? (
            <>
              {" "}
              <a href="/dashboard">Manage plan</a>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
