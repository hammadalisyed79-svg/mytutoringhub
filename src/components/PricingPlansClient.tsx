"use client";

import { useMemo, useState } from "react";
import type { ResolvedPlan } from "@/lib/plans";
import { ANNUAL_SAVE_FOOTNOTE, ANNUAL_SAVE_LABEL, formatPromoUntil, isRecurringAddOnPlan } from "@/lib/plans";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";
import { SubscribeButton } from "@/components/SubscribeButton";
import { LaunchOfferBlock } from "@/components/LaunchOfferBlock";
import Link from "next/link";
import { ManualPlanActivationButton } from "@/components/ManualPlanActivationButton";
import { manualActivationCtaLabel, addOnBillingFootnote, planBillingFootnote } from "@/lib/payments-status";
import { STUDENT_FREE_CONTACT_LIMIT } from "@/lib/plan-limits";
import { BUSINESS } from "@/lib/business-rules";

function planOneTime(plan: ResolvedPlan) {
  return Boolean(plan.isAddOn) && !isRecurringAddOnPlan(plan.id);
}

function PlanActions({
  plan,
  currency,
  signedIn,
  featured,
  billing,
  paidCheckoutLive,
  hubPointsBalance = 0,
  subjectProfileId,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  signedIn: boolean;
  featured?: boolean;
  billing: "monthly" | "annual";
  paidCheckoutLive: boolean;
  hubPointsBalance?: number;
  subjectProfileId?: string;
}) {
  if (signedIn) {
    const listingBound = plan.id === "AD_BOOST" || plan.id === "HIGHLIGHTED_AD";
    if (listingBound && !subjectProfileId) {
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
          plan={plan.id}
          planName={plan.name}
          label={manualActivationCtaLabel(plan.name)}
          featured={featured || plan.id === "VERIFIED_TUTOR"}
          oneTime={planOneTime(plan)}
          subjectProfileId={subjectProfileId}
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
        oneTime={planOneTime(plan)}
        label={
          plan.isAddOn
            ? plan.id === "AD_BOOST" && billing === "annual"
              ? `Add ${plan.name} (1 year · ~20% off)`
              : isRecurringAddOnPlan(plan.id)
                ? `Subscribe · ${plan.name}`
                : `Add ${plan.name}`
            : plan.isComplimentary
              ? `Activate ${plan.name} free`
              : `Pay with Safepay · ${plan.name}`
        }
        featured={featured}
        complimentary={plan.isComplimentary}
        subjectProfileId={subjectProfileId}
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
          Launch offer · free until {formatPromoUntil(plan.promoEndsAt)}. Then{" "}
          {formatPlanPrice(plan.listPricePkr, currency)}/mo.
        </p>
      </div>
    );
  }
  if (plan.isAddOn) {
    if (isRecurringAddOnPlan(plan.id)) {
      const showAnnualExtra = billing === "annual" && plan.annualChargePricePkr != null;
      return (
        <div className="price-block">
          <div className="price">
            {formatPlanPrice(
              showAnnualExtra ? plan.annualChargePricePkr! : plan.listPricePkr,
              currency,
              showAnnualExtra ? "year" : "month",
            )}
          </div>
          {showAnnualExtra ? (
            <p className="price-was">{formatPlanPrice(plan.listPricePkr * 12, currency, "month")}</p>
          ) : null}
          <p className="plan-billing muted">
            {showAnnualExtra
              ? `Billed yearly · +1 live Teaching Profile · ${currency}`
              : `Billed monthly · +1 live Teaching Profile · ${currency}`}
          </p>
        </div>
      );
    }
    const kind = plan.id === "AD_BOOST" || plan.id === "HIGHLIGHTED_AD" ? "boost" : "verification";
    const showAnnualBoost =
      kind === "boost" &&
      billing === "annual" &&
      plan.annualChargePricePkr != null &&
      plan.id === "AD_BOOST";
    return (
      <div className="price-block">
        <div className="price">
          {formatPlanPrice(
            showAnnualBoost ? plan.annualChargePricePkr! : plan.listPricePkr,
            currency,
            "once",
          )}
        </div>
        {showAnnualBoost ? (
          <p className="price-was">{formatPlanPrice(plan.listPricePkr * 12, currency, "once")}</p>
        ) : null}
        <p className="plan-billing muted">
          {addOnBillingFootnote(
            currency,
            paidCheckoutLive,
            kind,
            showAnnualBoost ? "annual" : "once",
          )}
        </p>
      </div>
    );
  }
  if (showAnnual) {
    return (
      <div className="price-block">
        <div className="price">{formatPlanPrice(plan.annualChargePricePkr!, currency, "year")}</div>
        <p className="price-was">{formatPlanPrice(plan.listPricePkr * 12, currency)}</p>
        <p className="plan-billing muted">
          Billed yearly · save ~20% · about{" "}
          {formatPlanPrice(Math.round(plan.annualChargePricePkr! / 12), currency)}/mo equivalent ·{" "}
          {currency}
          {paidCheckoutLive ? " · Safepay" : ""}
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

function PlanCard({
  plan,
  currency,
  signedIn,
  billing,
  paidCheckoutLive,
  hubPointsBalance,
  subjectProfileId,
  featured,
  badge,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  signedIn: boolean;
  billing: "monthly" | "annual";
  paidCheckoutLive: boolean;
  hubPointsBalance?: number;
  subjectProfileId?: string;
  featured?: boolean;
  badge?: string | null;
}) {
  const planBilling =
    plan.id === "AD_BOOST" || plan.id === "EXTRA_ACTIVE" ? billing : plan.isAddOn ? "monthly" : billing;

  return (
    <article className={`plan${featured ? " plan-featured" : ""}`}>
      <div className="plan-body">
        {badge ? <span className="plan-badge">{badge}</span> : null}
        <h3>{plan.name}</h3>
        <p className="muted">{plan.description}</p>
        <PlanPrice
          plan={plan}
          currency={currency}
          billing={planBilling}
          paidCheckoutLive={paidCheckoutLive}
        />
        {plan.promoNote && plan.isPromoActive && plan.id !== "TUTOR_BASIC" ? (
          <p className="promo-note">{plan.promoNote}</p>
        ) : null}
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
          featured={featured}
          billing={planBilling}
          paidCheckoutLive={paidCheckoutLive}
          hubPointsBalance={hubPointsBalance}
          subjectProfileId={
            plan.id === "AD_BOOST" || plan.id === "HIGHLIGHTED_AD" ? subjectProfileId : undefined
          }
        />
      </div>
    </article>
  );
}

function planBadge(plan: ResolvedPlan): string | null {
  if (plan.isPromoActive) return plan.promoLabel || "Limited offer";
  if (plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC") return "Most popular";
  if (plan.id === "STUDENT_PRO") return "Includes AI";
  if (plan.id === "VERIFIED_TUTOR") return "Recommended";
  if (plan.id === "EXTRA_ACTIVE") return "Add capacity";
  return null;
}

export function PricingPlansClient({
  corePlans,
  addOns,
  currency,
  signedIn,
  paidCheckoutLive,
  hubPointsBalance = 0,
  subjectProfileId,
  defaultAudience,
}: {
  corePlans: ResolvedPlan[];
  addOns: ResolvedPlan[];
  currency: CurrencyCode;
  signedIn: boolean;
  paidCheckoutLive: boolean;
  hubPointsBalance?: number;
  subjectProfileId?: string;
  /** When both audiences are visible, which tab to open first. */
  defaultAudience?: "student" | "tutor";
}) {
  const studentCore = useMemo(
    () => corePlans.filter((p) => p.audience === "student"),
    [corePlans],
  );
  const tutorCore = useMemo(() => corePlans.filter((p) => p.audience === "tutor"), [corePlans]);
  const capacityAddOn = useMemo(
    () => addOns.find((p) => p.id === "EXTRA_ACTIVE") ?? null,
    [addOns],
  );
  const visibilityAddOns = useMemo(
    () => addOns.filter((p) => p.id !== "EXTRA_ACTIVE"),
    [addOns],
  );

  const tutorProOffer = useMemo(
    () => tutorCore.find((p) => p.id === "TUTOR_BASIC" && p.isPromoActive) ?? null,
    [tutorCore],
  );

  const showStudent = studentCore.length > 0;
  const showTutor = tutorCore.length > 0 || addOns.length > 0;
  const bothAudiences = showStudent && showTutor;

  const [audience, setAudience] = useState<"student" | "tutor">(
    defaultAudience === "tutor" || (!showStudent && showTutor)
      ? "tutor"
      : defaultAudience === "student" || showStudent
        ? "student"
        : "tutor",
  );
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const hasAnnual =
    corePlans.some((p) => !p.isAddOn && p.annualChargePricePkr != null) ||
    addOns.some(
      (p) =>
        (p.id === "AD_BOOST" || p.id === "EXTRA_ACTIVE") && p.annualChargePricePkr != null,
    );

  const viewingStudent = bothAudiences ? audience === "student" : showStudent;
  const viewingTutor = bothAudiences ? audience === "tutor" : showTutor;

  const sharedProps = {
    currency,
    signedIn,
    billing,
    paidCheckoutLive,
    hubPointsBalance,
    subjectProfileId,
  } as const;

  return (
    <div id="plans" className="pricing-plans">
      {bothAudiences ? (
        <div className="pricing-audience-tabs" role="tablist" aria-label="Who is this for?">
          <button
            type="button"
            role="tab"
            aria-selected={audience === "student"}
            className={`pricing-audience-tab${audience === "student" ? " is-active" : ""}`}
            onClick={() => setAudience("student")}
          >
            For students
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={audience === "tutor"}
            className={`pricing-audience-tab${audience === "tutor" ? " is-active" : ""}`}
            onClick={() => setAudience("tutor")}
          >
            For tutors
          </button>
        </div>
      ) : null}

      {hasAnnual ? (
        <div className="pricing-billing-bar">
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
              {ANNUAL_SAVE_LABEL}
            </button>
          </div>
          <p className="muted pricing-addons-lead">{ANNUAL_SAVE_FOOTNOTE}</p>
        </div>
      ) : null}

      {viewingStudent ? (
        <section className="pricing-section-block" aria-labelledby="student-plans-heading">
          <header className="pricing-section-intro">
            <h2 id="student-plans-heading" className="checkout-section-title">
              Student plans
            </h2>
            <p className="muted pricing-addons-lead">
              Browse free. Upgrade only if you need unlimited messaging, request ads, or study tools.
              Lesson fees stay between you and the tutor.
            </p>
          </header>

          <div className="pricing-grid" style={{ marginBottom: "1.25rem" }}>
            <article className="plan">
              <div className="plan-body">
                <span className="plan-badge plan-badge-soft">Always free</span>
                <h3>Student Free</h3>
                <p className="muted">Search tutors and message with a monthly contact allowance.</p>
                <div className="price-block">
                  <div className="price">Free</div>
                </div>
                <ul>
                  <li>Search &amp; browse tutors worldwide</li>
                  <li>{STUDENT_FREE_CONTACT_LIMIT} new tutor contacts per month</li>
                  <li>Unlimited replies in existing chats</li>
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

            {studentCore.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                {...sharedProps}
                featured={plan.id === "STUDENT_PASS" || plan.id === "STUDENT_PRO"}
                badge={planBadge(plan)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {viewingTutor ? (
        <section className="pricing-section-block" aria-labelledby="tutor-plans-heading">
          <header className="pricing-section-intro">
            <h2 id="tutor-plans-heading" className="checkout-section-title">
              Tutor plans
            </h2>
            <p className="muted pricing-addons-lead">
              List free with {BUSINESS.tutorFreeActiveListings} live Teaching Profile. Need another
              subject live? Add Extra Active (paid capacity). Growing fast? Tutor Pro unlocks up to{" "}
              {BUSINESS.tutorProActiveListings} live profiles plus ranking and unlimited enquiry
              reveals
              {tutorProOffer?.isComplimentary
                ? " — complimentary under the Launch offer until the stated date"
                : ""}
              .
            </p>
          </header>

          {tutorProOffer ? (
            <LaunchOfferBlock
              plan={tutorProOffer}
              currency={currency}
              signedIn={signedIn}
              paidCheckoutLive={paidCheckoutLive}
              plansHref="#plans"
            />
          ) : null}

          <ol className="pricing-path" aria-label="Tutor growth path">
            <li>
              <strong>Free</strong>
              <span>{BUSINESS.tutorFreeActiveListings} live profile</span>
            </li>
            <li>
              <strong>Extra Active</strong>
              <span>+1 live · up to 3 total</span>
            </li>
            <li>
              <strong>Tutor Pro</strong>
              <span>Up to {BUSINESS.tutorProActiveListings} live + growth tools</span>
            </li>
          </ol>

          <div className="pricing-grid" style={{ marginBottom: "1.5rem" }}>
            <article className="plan">
              <div className="plan-body">
                <span className="plan-badge plan-badge-soft">Always free</span>
                <h3>Tutor Free</h3>
                <p className="muted">Complete your profile and appear in search worldwide.</p>
                <div className="price-block">
                  <div className="price">Free</div>
                </div>
                <ul>
                  <li>Appear in search when your profile is complete</li>
                  <li>{BUSINESS.tutorFreeActiveListings} active Teaching Profile</li>
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

            {capacityAddOn ? (
              <PlanCard
                plan={capacityAddOn}
                {...sharedProps}
                featured={false}
                badge={planBadge(capacityAddOn)}
              />
            ) : null}

            {tutorCore.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                {...sharedProps}
                featured={plan.id === "TUTOR_BASIC"}
                badge={planBadge(plan)}
              />
            ))}
          </div>

          {visibilityAddOns.length > 0 ? (
            <div className="pricing-addons-section">
              <header className="pricing-section-intro">
                <h3 className="checkout-section-title">Optional extras</h3>
                <p className="muted pricing-addons-lead">
                  Visibility and verification only — these do not add live Teaching Profile capacity.
                  Prefer Tutor Pro or Extra Active when you need more subjects live.
                </p>
              </header>
              <div className="pricing-grid pricing-addons">
                {visibilityAddOns.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    {...sharedProps}
                    featured={plan.id === "VERIFIED_TUTOR"}
                    badge={planBadge(plan)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <aside className="panel pricing-coming-soon">
        <h2 className="checkout-section-title">Good to know</h2>
        <ul className="pricing-notes-list">
          <li>No shopping cart — pick a plan and checkout in one step{paidCheckoutLive ? " on Safepay" : ""}.</li>
          <li>
            Listing Boost is bought per Teaching Profile from your{" "}
            <Link href="/dashboard/tutor?tab=profile#teaching-listings">tutor dashboard</Link>.
          </li>
          <li>
            Still comparing?{" "}
            <Link href="/free-vs-paid">Free vs paid guide</Link> ·{" "}
            <Link href="/help">Help &amp; FAQ</Link>
          </li>
        </ul>
      </aside>
    </div>
  );
}
