"use client";

import { useState } from "react";
import type { ResolvedPlan } from "@/lib/plans";
import { formatPromoUntil } from "@/lib/plans";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";
import { SubscribeButton } from "@/components/SubscribeButton";
import Link from "next/link";
import { ManualPlanActivationButton } from "@/components/ManualPlanActivationButton";
import { manualActivationCtaLabel, addOnBillingFootnote, planBillingFootnote } from "@/lib/payments-status";
import { STUDENT_FREE_CONTACT_LIMIT } from "@/lib/plan-limits";
import { BUSINESS } from "@/lib/business-rules";

function PlanActions({
  plan,
  currency,
  signedIn,
  featured,
  billing,
  paidCheckoutLive,
  hubPointsBalance = 0,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  signedIn: boolean;
  featured?: boolean;
  billing: "monthly" | "annual";
  paidCheckoutLive: boolean;
  hubPointsBalance?: number;
}) {
  if (signedIn) {
    if (plan.id === "AD_BOOST" || plan.id === "HIGHLIGHTED_AD") {
      return (
        <Link
          href="/dashboard/tutor?tab=profile#teaching-listings"
          className="btn btn-block btn-secondary"
        >
          Choose a Teaching Profile
        </Link>
      );
    }

    if (!paidCheckoutLive && !plan.isComplimentary) {
      return (
        <ManualPlanActivationButton
          planName={plan.name}
          label={manualActivationCtaLabel(plan.name)}
          featured={featured || plan.id === "VERIFIED_TUTOR"}
        />
      );
    }

    return (
      <SubscribeButton
        plan={plan.id}
        currency={currency}
        billing={billing}
        hubPointsBalance={hubPointsBalance}
        listPricePkr={
          billing === "annual" && plan.annualChargePricePkr != null
            ? plan.annualChargePricePkr
            : plan.chargePricePkr
        }
        oneTime={Boolean(plan.isAddOn)}
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
  paidCheckoutLive,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  billing: "monthly" | "annual";
  paidCheckoutLive: boolean;
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
  if (plan.isAddOn) {
    const kind = plan.id === "AD_BOOST" || plan.id === "HIGHLIGHTED_AD" ? "boost" : "verification";
    return (
      <div className="price-block">
        <div className="price">{formatPlanPrice(plan.listPricePkr, currency, "once")}</div>
        <p className="plan-billing muted">
          {addOnBillingFootnote(currency, paidCheckoutLive, kind)}
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
          equivalent · shown in {currency} ·{" "}
          {paidCheckoutLive ? "paid on Safepay" : "activate after payment"}
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
      <p className="plan-billing muted">{planBillingFootnote(currency, paidCheckoutLive, billing)}</p>
    </div>
  );
}

export function PricingPlansClient({
  corePlans,
  addOns,
  currency,
  signedIn,
  paidCheckoutLive,
  hubPointsBalance = 0,
}: {
  corePlans: ResolvedPlan[];
  addOns: ResolvedPlan[];
  currency: CurrencyCode;
  signedIn: boolean;
  paidCheckoutLive: boolean;
  hubPointsBalance?: number;
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const hasAnnual = corePlans.some((p) => !p.isAddOn && p.annualChargePricePkr != null);

  return (
    <>
      {hasAnnual && (
        <div className="billing-toggle" role="group" aria-label="Billing period">
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
        <h2 className="checkout-section-title">Start free</h2>
        <p className="muted pricing-addons-lead">
          Create an account at no cost before you upgrade. Students get{" "}
          {STUDENT_FREE_CONTACT_LIMIT} new tutor contacts per month; tutors with a complete profile
          appear in search free.
        </p>
        <div className="pricing-grid" style={{ marginBottom: "1.75rem" }}>
          <article className="plan">
            <div className="plan-body">
              <h3>Student Free</h3>
              <p className="muted">Browse tutors and message with a monthly contact allowance.</p>
              <div className="price-block">
                <div className="price">Free</div>
              </div>
              <ul>
                <li>Search &amp; browse tutors</li>
                <li>{STUDENT_FREE_CONTACT_LIMIT} new tutor contacts per month</li>
                <li>Reply in existing conversations</li>
                <li>No commission on lesson fees</li>
              </ul>
            </div>
            <div className="plan-cta">
              {signedIn ? (
                <Link href="/search" className="btn btn-block btn-secondary">
                  Find tutors
                </Link>
              ) : (
                <Link href="/register?role=student" className="btn btn-block btn-secondary">
                  Join free as student
                </Link>
              )}
            </div>
          </article>
          <article className="plan">
            <div className="plan-body">
              <h3>Tutor Free</h3>
              <p className="muted">Complete your profile and appear in search worldwide.</p>
              <div className="price-block">
                <div className="price">Free</div>
              </div>
              <ul>
                <li>Appear in search when profile is complete</li>
                <li>Up to {BUSINESS.tutorFreeActiveListings} active Teaching Profiles</li>
                <li>Receive &amp; reply to student messages</li>
                <li>Monthly enquiry allowance when you message first</li>
                <li>Keep 100% of lesson fees</li>
              </ul>
            </div>
            <div className="plan-cta">
              {signedIn ? (
                <Link href="/become-a-tutor" className="btn btn-block btn-secondary">
                  Tutor tools
                </Link>
              ) : (
                <Link href="/register?role=tutor" className="btn btn-block btn-secondary">
                  Join free as tutor
                </Link>
              )}
            </div>
          </article>
        </div>
      </section>

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
                <PlanPrice
                  plan={plan}
                  currency={currency}
                  billing={billing}
                  paidCheckoutLive={paidCheckoutLive}
                />
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
                  hubPointsBalance={hubPointsBalance}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {addOns.length > 0 && (
        <section className="pricing-addons-section">
          <h2 className="checkout-section-title">Optional tutor boosts</h2>
          <p className="muted pricing-addons-lead">
            Optional visibility upgrades — Priority Verification Review and Listing Boost
            {paidCheckoutLive ? " on Safepay" : " after payment"}. Teaching Profile capacity is included in
            Free ({BUSINESS.tutorFreeActiveListings}) and Tutor Pro ({BUSINESS.tutorProActiveListings});
            legacy Extra/Unlimited packs are not sold as primary products. Listing Boost does not
            increase Teaching Profile capacity.
          </p>
          <div className="pricing-grid pricing-addons">
            {addOns.map((plan) => (
              <article
                key={plan.id}
                className={`plan${plan.id === "VERIFIED_TUTOR" ? " plan-featured" : ""}`}
              >
                <div className="plan-body">
                  {plan.id === "VERIFIED_TUTOR" ? (
                    <span className="plan-badge">Recommended</span>
                  ) : plan.isPromoActive ? (
                    <span className="plan-badge">{plan.promoLabel || "Limited offer"}</span>
                  ) : null}
                  <h3>{plan.name}</h3>
                  <p className="muted">{plan.description}</p>
                  <PlanPrice
                    plan={plan}
                    currency={currency}
                    billing="monthly"
                    paidCheckoutLive={paidCheckoutLive}
                  />
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
                    featured={plan.id === "VERIFIED_TUTOR"}
                    billing="monthly"
                    paidCheckoutLive={paidCheckoutLive}
                    hubPointsBalance={hubPointsBalance}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <aside className="panel pricing-coming-soon">
        <h2 className="checkout-section-title">Coming soon</h2>
        <p className="muted">
          One-time booking fees, group class listings, and resource uploads are not sold yet. Listing
          Boost is available now — open your tutor dashboard, pick a Teaching Profile, and boost that
          profile.
        </p>
      </aside>
    </>
  );
}
