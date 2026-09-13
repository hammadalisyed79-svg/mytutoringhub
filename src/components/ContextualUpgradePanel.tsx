"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SubscribeButton } from "@/components/SubscribeButton";
import { fireConversionEvent } from "@/components/ConversionBeacon";
import type { SubscriptionPlan } from "@/lib/types";
import type { PurchaseTrigger } from "@/lib/purchase-context";

/**
 * Compact, non-aggressive upgrade panel at the moment of need.
 * Shows product, price transparency, benefits, primary checkout CTA, and Maybe later.
 */
export function ContextualUpgradePanel({
  title,
  lead,
  plan,
  planLabel,
  priceLabel,
  billingLabel,
  benefits,
  ctaLabel,
  maybeLaterHref,
  maybeLaterLabel = "Maybe later",
  currency,
  billing = "monthly",
  oneTime,
  complimentary,
  paidCheckoutLive = true,
  subjectProfileId,
  returnUrl,
  trigger,
  sourcePage,
  annualOption,
  listPricePkr,
  hubPointsBalance = 0,
  footnote,
}: {
  title: string;
  lead?: string;
  plan: SubscriptionPlan;
  planLabel: string;
  priceLabel: string;
  billingLabel: string;
  benefits: string[];
  ctaLabel: string;
  maybeLaterHref?: string;
  maybeLaterLabel?: string;
  currency?: string;
  billing?: "monthly" | "annual";
  oneTime?: boolean;
  complimentary?: boolean;
  paidCheckoutLive?: boolean;
  subjectProfileId?: string;
  returnUrl?: string;
  trigger?: PurchaseTrigger;
  sourcePage?: string;
  /** When set, shows Monthly | Annual toggle for subscriptions. */
  annualOption?: { monthlyLabel: string; annualLabel: string };
  listPricePkr?: number;
  hubPointsBalance?: number;
  footnote?: string;
}) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(billing);
  const upsellEvent =
    plan === "STUDENT_PASS"
      ? "student_pass_upsell_view"
      : plan === "STUDENT_PRO"
        ? "student_pro_upsell_view"
        : plan === "TUTOR_BASIC"
          ? "tutor_pro_upsell_view"
          : null;

  useEffect(() => {
    if (!upsellEvent) return;
    fireConversionEvent(
      upsellEvent,
      {
        plan,
        trigger: trigger || undefined,
        source_page: sourcePage || undefined,
      },
      `upsell_${plan}_${trigger || "context"}_${sourcePage || "page"}`,
    );
    fireConversionEvent(
      "upgrade_prompt_view",
      {
        plan,
        trigger: trigger || undefined,
        source_page: sourcePage || undefined,
      },
      `prompt_${plan}_${trigger || "context"}`,
    );
  }, [upsellEvent, plan, trigger, sourcePage]);

  const priceShown =
    annualOption && billingPeriod === "annual" ? annualOption.annualLabel : priceLabel;
  const billingShown =
    annualOption && billingPeriod === "annual"
      ? "Billed yearly · Save 20%"
      : billingLabel;

  return (
    <aside className="contextual-upgrade panel" data-plan={plan} data-trigger={trigger || ""}>
      <h3 className="contextual-upgrade-title">{title}</h3>
      {lead ? <p className="muted">{lead}</p> : null}
      <div className="contextual-upgrade-product">
        <strong>{planLabel}</strong>
        <p className="contextual-upgrade-price">
          {priceShown}
          <span className="muted"> · {billingShown}</span>
        </p>
      </div>
      {annualOption && !oneTime && !complimentary ? (
        <div className="contextual-upgrade-billing" role="group" aria-label="Billing period">
          <button
            type="button"
            className={billingPeriod === "monthly" ? "is-active" : ""}
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billingPeriod === "annual" ? "is-active" : ""}
            onClick={() => setBillingPeriod("annual")}
          >
            Annual — Save 20%
          </button>
        </div>
      ) : null}
      <ul className="contextual-upgrade-benefits">
        {benefits.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      {footnote ? <p className="field-hint">{footnote}</p> : null}
      <SubscribeButton
        plan={plan}
        planLabel={planLabel}
        label={ctaLabel}
        currency={currency}
        billing={oneTime || complimentary ? undefined : billingPeriod}
        oneTime={oneTime}
        complimentary={complimentary}
        paidCheckoutLive={paidCheckoutLive}
        subjectProfileId={subjectProfileId}
        returnUrl={returnUrl}
        trigger={trigger}
        sourcePage={sourcePage}
        listPricePkr={listPricePkr}
        hubPointsBalance={hubPointsBalance}
        featured
      />
      {maybeLaterHref ? (
        <p className="contextual-upgrade-later">
          <Link href={maybeLaterHref}>{maybeLaterLabel}</Link>
        </p>
      ) : null}
    </aside>
  );
}
