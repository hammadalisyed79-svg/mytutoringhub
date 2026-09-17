"use client";

import { useMemo, useState } from "react";
import { ManualPlanActivationButton } from "@/components/ManualPlanActivationButton";
import { manualActivationCtaLabel, manualActivationNote } from "@/lib/payments-status";
import type { SubscriptionPlan } from "@/lib/types";
import { fireConversionEvent } from "@/components/ConversionBeacon";
import { checkoutStartedEventForPlan } from "@/lib/analytics-conversions";
import type { PurchaseTrigger } from "@/lib/purchase-context";
import { DEFAULT_PLANS } from "@/lib/plans";

/** Keep in sync with HUB_POINTS_* in lib/hub-points.ts (client-safe copy). */
const REDEMPTION_MAX_RATIO = 0.5;
const MIN_CASH_PKR = 100;

function maxRedeemablePoints(balance: number, orderPkr: number) {
  if (balance <= 0 || orderPkr <= 0) return 0;
  const capByPercent = Math.floor(orderPkr * REDEMPTION_MAX_RATIO);
  let max = Math.min(balance, capByPercent);
  if (orderPkr - max < MIN_CASH_PKR && orderPkr > MIN_CASH_PKR) {
    max = Math.max(0, orderPkr - MIN_CASH_PKR);
  }
  if (orderPkr <= MIN_CASH_PKR) {
    max = Math.min(max, Math.max(0, orderPkr - 1));
  }
  return Math.max(0, max);
}

function resolveListPricePkr(
  plan: SubscriptionPlan,
  billing: "monthly" | "annual" | undefined,
  explicit?: number,
) {
  if (explicit != null && explicit > 0) return explicit;
  const def = DEFAULT_PLANS.find((p) => p.id === plan);
  if (!def) return 0;
  if (billing === "annual" && def.annualPricePkr != null) return def.annualPricePkr;
  return def.pricePkr;
}

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

  const resolvedListPricePkr = useMemo(
    () => resolveListPricePkr(plan, billing, listPricePkr),
    [plan, billing, listPricePkr],
  );
  const redeemablePts = useMemo(
    () => maxRedeemablePoints(hubPointsBalance, resolvedListPricePkr),
    [hubPointsBalance, resolvedListPricePkr],
  );
  const canRedeem =
    !complimentary && hubPointsBalance > 0 && resolvedListPricePkr > 0 && redeemablePts > 0;

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
        currency: currency || "USD",
        trigger: trigger || undefined,
        source_page: sourcePage || undefined,
      },
      `intent_${plan}_${Date.now()}`,
    );

    const payload = {
      plan,
      currency,
      billing: billing ?? "monthly",
      useHubPoints: Boolean(useHubPoints && canRedeem),
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
      pointsRedeemedPkr?: number;
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
          currency: data.currency || currency || "USD",
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
      {canRedeem ? (
        <label className="points-checkout-toggle">
          <input
            type="checkbox"
            checked={useHubPoints}
            onChange={(e) => setUseHubPoints(e.target.checked)}
          />
          Apply Hub Points
          {useHubPoints
            ? ` (−${redeemablePts.toLocaleString()} pts, up to 50% off)`
            : ` (${hubPointsBalance.toLocaleString()} pts available)`}
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
