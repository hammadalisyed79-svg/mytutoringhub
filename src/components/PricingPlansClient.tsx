"use client";

import { useState } from "react";
import type { ResolvedPlan } from "@/lib/plans";
import { formatPromoUntil } from "@/lib/plans";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";
import { SubscribeButton } from "@/components/SubscribeButton";
import Link from "next/link";
import { manualPlanActivationMailto } from "@/lib/payments-status";

function PlanActions({
  plan,
  currency,
  signedIn,
  featured,
  billing,
  paidCheckoutLive,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  signedIn: boolean;
  featured?: boolean;
  billing: "monthly" | "annual";
  paidCheckoutLive: boolean;
}) {
  if (signedIn) {
    if (!paidCheckoutLive && !plan.isComplimentary) {
      return (
        <div className="checkout-action">
          <a
            className={`btn btn-block ${featured ? "" : "btn-secondary"}`}
            href={manualPlanActivationMailto(plan.name)}
          >
            Email to activate {plan.name}
          </a>
          <p className="checkout-trust muted">Card checkout opening soon · Manual activation available</p>
        </div>
      );
    }

    return (
      <SubscribeButton
        plan={plan.id}
        currency={currency}
        billing={billing}
        label={
          plan.isAddOn
            ? `Add ${plan.name}`
            : plan.isComplimentary
              ? `Activate ${plan.name} free`
              : `Pay with Safepay · ${plan.name}`
        }
        featured={featured}
        complimentary={plan.isComplimentary}
      />
    );
  }

  if (plan.audience === "student") {
    return (
      <Link href="/register?role=student" className="btn btn-block">
        Join as student
      </Link>
    );
  }

  return (
    <Link
      href="/register?role=tutor"
      className={`btn btn-block ${plan.isAddOn && !featured ? "btn-secondary" : ""}`}
    >
      Join as tutor
    </Link>
  );
}

function PlanPrice({
  plan,
  currency,
  billing,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  billing: "monthly" | "annual";
}) {
  const showAnnual =
    billing === "annual" && !plan.isAddOn && plan.annualChargePricePkr != null && !plan.isComplimentary;

  if (plan.isComplimentary) {
    return (
      <div className="price-block">
        <div className="price">Complimentary</div>
        <p className="price-was">{formatPlanPrice(plan.listPricePkr, currency)}</p>
        <p className="plan-billing">
          Free until {formatPromoUntil(plan.promoEndsAt)}. Then{" "}
          {formatPlanPrice(plan.listPricePkr, currency)}.
        </p>
      </div>
    );
  }
  if (showAnnual) {
    return (
      <div className="price-block">
        <div className="price">{formatPlanPrice(plan.annualChargePricePkr!, currency, "year")}</div>
        <p className="price-was">{formatPlanPrice(plan.listPricePkr, currency)}</p>
        <p className="plan-billing muted">
          Billed annually · about {formatPlanPrice(Math.round(plan.annualChargePricePkr! / 12), currency)}{" "}
          equivalent · shown in {currency} · paid on Safepay
        </p>
      </div>
    );
  }
  if (plan.isPromoActive) {
    return (
      <div className="price-block">
        <div className="price">{formatPlanPrice(plan.chargePricePkr, currency)}</div>
        <p className="price-was">{formatPlanPrice(plan.listPricePkr, currency)}</p>
        <p className="plan-billing">
          {plan.savingsPercent}% off until {formatPromoUntil(plan.promoEndsAt)} · then{" "}
          {formatPlanPrice(plan.listPricePkr, currency)}
        </p>
      </div>
    );
  }
  return (
    <div className="price-block">
      <div className="price">{formatPlanPrice(plan.listPricePkr, currency)}</div>
      <p className="plan-billing muted">Billed monthly · shown in {currency} · paid on Safepay</p>
    </div>
  );
}

export function PricingPlansClient({
  corePlans,
  addOns,
  currency,
  signedIn,
  paidCheckoutLive,
}: {
  corePlans: ResolvedPlan[];
  addOns: ResolvedPlan[];
  currency: CurrencyCode;
  signedIn: boolean;
  paidCheckoutLive: boolean;
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const hasAnnual = corePlans.some((p) => !p.isAddOn && p.annualChargePricePkr != null);

  return (
    <>
      {hasAnnual && (
        <div
          className="billing-toggle"
          role="group"
          aria-label="Billing period"
          style={{
            display: "inline-flex",
            gap: "0.35rem",
            marginBottom: "1.25rem",
            padding: "0.25rem",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "var(--paper-deep)",
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${billing === "monthly" ? "" : "btn-secondary"}`}
            aria-pressed={billing === "monthly"}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`btn btn-sm ${billing === "annual" ? "" : "btn-secondary"}`}
            aria-pressed={billing === "annual"}
            onClick={() => setBilling("annual")}
          >
            Annual · save ~20%
          </button>
        </div>
      )}

      <section>
        <h2 className="checkout-section-title">Core plans</h2>
        <div className="pricing-grid">
          {corePlans.map((plan) => (
            <article
              key={plan.id}
              className={`plan ${plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC" || plan.id === "STUDENT_PRO" ? "plan-featured" : ""}`}
            >
              <div className="plan-body">
                {plan.isPromoActive ? (
                  <span className="plan-badge">{plan.promoLabel || "Limited offer"}</span>
                ) : (
                  (plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC") && (
                    <span className="plan-badge">Most popular</span>
                  )
                )}
                {plan.id === "STUDENT_PRO" && !plan.isPromoActive && (
                  <span className="plan-badge">Includes AI</span>
                )}
                <h3>{plan.name}</h3>
                <p className="muted">{plan.description}</p>
                <PlanPrice plan={plan} currency={currency} billing={billing} />
                {plan.promoNote && plan.isPromoActive && (
                  <p className="promo-note">{plan.promoNote}</p>
                )}
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="plan-cta">
                <PlanActions
                  plan={plan}
                  currency={currency}
                  signedIn={signedIn}
                  featured={plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC"}
                  billing={billing}
                  paidCheckoutLive={paidCheckoutLive}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {addOns.length > 0 && (
        <section style={{ marginTop: "2rem" }}>
          <h2 className="checkout-section-title">Tutor add-ons</h2>
          <p className="muted" style={{ marginTop: "-0.4rem", marginBottom: "1rem" }}>
            Optional visibility upgrades. Verified badge, highlight, boost, and extra ads are billed
            separately{paidCheckoutLive ? " on Safepay" : ""} (one-time or monthly as shown).
          </p>
          <div className="pricing-grid pricing-addons">
            {addOns.map((plan) => (
              <article key={plan.id} className="plan">
                <div className="plan-body">
                  {plan.isPromoActive && (
                    <span className="plan-badge">{plan.promoLabel || "Limited offer"}</span>
                  )}
                  <h3>{plan.name}</h3>
                  <p className="muted">{plan.description}</p>
                  <PlanPrice plan={plan} currency={currency} billing="monthly" />
                  <ul>
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="plan-cta">
                  <PlanActions
                    plan={plan}
                    currency={currency}
                    signedIn={signedIn}
                    billing="monthly"
                    paidCheckoutLive={paidCheckoutLive}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <aside className="panel" style={{ marginTop: "2rem" }}>
        <h2 className="checkout-section-title" style={{ marginTop: 0 }}>
          Coming soon
        </h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          One-time booking / first-lesson fees, one-time profile boosts, group class listings, and
          resource uploads are not sold yet. Only the plans and add-ons above are live on Safepay.
        </p>
      </aside>
    </>
  );
}
