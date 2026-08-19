"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type PricingEntry,
  getPricingForCountry,
  formatPrice,
  SUPPORTED_COUNTRIES,
} from "@/lib/pricing";

type BillingCycle = "monthly" | "annual";
type AudienceKey = "tutors" | "students";

type Plan = {
  name: string;
  monthlyValue: number;
  annualValue: number;
  description: string;
  benefits: string[];
  cta: string;
  href: string;
  featured?: boolean;
  isFree?: boolean;
};

const faqs = [
  {
    question: "Do you take a percentage commission from lessons?",
    answer:
      "No. MyTutoringHub uses subscriptions and clear one-time service fees instead of taking a percentage from lesson payments.",
  },
  {
    question: "What changes when I switch to annual billing?",
    answer:
      "You keep the same plan benefits, but you pay once per year at roughly a 20% saving compared with monthly billing.",
  },
  {
    question: "Can tutors and students stay on the free plan?",
    answer:
      "Yes. Free plans stay available for browsing, listing, and limited usage, with paid tiers unlocking higher limits and premium tools.",
  },
  {
    question: "Are service fees included in subscriptions?",
    answer:
      "No. Service fees are separate one-time charges tied to specific actions such as boosts, group class listings, or bundle downloads.",
  },
];

function buildPlans(pricing: PricingEntry): {
  tutors: Plan[];
  students: Plan[];
} {
  return {
    tutors: [
      {
        name: "Free Starter",
        monthlyValue: 0,
        annualValue: 0,
        description: "Best for getting listed and testing demand.",
        benefits: [
          "Profile listing",
          "5 enquiry reveals per month",
          "Appear in tutor search",
        ],
        cta: "Get Started Free",
        href: "/register?role=tutor",
        isFree: true,
      },
      {
        name: "Tutor Pro",
        monthlyValue: pricing.tutorPro.monthly,
        annualValue: pricing.tutorPro.annual,
        description: "The most popular plan for active private tutors.",
        benefits: [
          "Unlimited enquiry reveals",
          "Priority placement in search",
          "Verified badge",
          "Analytics dashboard",
        ],
        cta: "Upgrade Now",
        href: "/register?role=tutor",
        featured: true,
      },
      {
        name: "Tutor Elite",
        monthlyValue: pricing.tutorElite.monthly,
        annualValue: pricing.tutorElite.annual,
        description: "Extra visibility and early access for top-performing tutors.",
        benefits: [
          "Everything in Tutor Pro",
          "Featured placement",
          "Homepage spotlight rotation",
          "Early access to new subjects and past papers",
        ],
        cta: "Upgrade Now",
        href: "/register?role=tutor",
      },
    ],
    students: [
      {
        name: "Free",
        monthlyValue: 0,
        annualValue: 0,
        description: "Browse tutors and access essentials before upgrading.",
        benefits: [
          "Search tutors",
          "3 tutor contacts per month",
          "Access free past papers",
        ],
        cta: "Get Started Free",
        href: "/register?role=student",
        isFree: true,
      },
      {
        name: "Student Study Plus",
        monthlyValue: pricing.studentPlus.monthly,
        annualValue: pricing.studentPlus.annual,
        description: "Ideal for families and learners actively booking support.",
        benefits: [
          "Unlimited tutor contacts",
          "Full past paper library access",
          "Progress tracking",
        ],
        cta: "Upgrade Now",
        href: "/register?role=student",
        featured: true,
      },
      {
        name: "Student Pro",
        monthlyValue: pricing.studentPro.monthly,
        annualValue: pricing.studentPro.annual,
        description: "For ambitious students who want premium study tools.",
        benefits: [
          "Everything in Study Plus",
          "AI study assistant",
          "Exam countdown tools",
          "Priority support",
        ],
        cta: "Upgrade Now",
        href: "/register?role=student",
      },
    ],
  };
}

type Props = {
  pricing: PricingEntry;
  detectedCountryCode: string;
};

export function PricingPlans({ pricing: initialPricing, detectedCountryCode }: Props) {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [audience, setAudience] = useState<AudienceKey>("tutors");
  const [selectedCountry, setSelectedCountry] = useState<string>(
    detectedCountryCode in
      Object.fromEntries(SUPPORTED_COUNTRIES.map((c) => [c.code, true]))
      ? detectedCountryCode
      : "DEFAULT",
  );

  const pricing = useMemo(
    () =>
      selectedCountry === "DEFAULT"
        ? initialPricing
        : getPricingForCountry(selectedCountry),
    [selectedCountry, initialPricing],
  );

  const plans = useMemo(() => buildPlans(pricing), [pricing]);

  function displayPrice(plan: Plan): string {
    if (plan.isFree) return `${pricing.currencySymbol}0`;
    const value = billing === "monthly" ? plan.monthlyValue : plan.annualValue;
    return formatPrice(value, pricing.currencySymbol);
  }

  function annualNote(plan: Plan): string {
    if (plan.isFree) return "No annual charge";
    const monthly = plan.monthlyValue;
    const annualMonthly = plan.annualValue / 12;
    return `Equivalent to ${formatPrice(annualMonthly, pricing.currencySymbol)}/mo, billed yearly`;
  }

  return (
    <div className="pricing-shell stack-lg">
      <section className="pricing-hero">
        <div className="pricing-hero-copy">
          <p className="eyebrow">Simple marketplace pricing</p>
          <h1 className="pricing-title">Pricing that grows with tutors and students</h1>
          <p className="pricing-lead">
            {pricing.tagline}. Subscriptions unlock visibility, tools, and contact limits —
            one-time service fees only apply when you trigger a paid event.
          </p>
        </div>

        <div className="pricing-control-card">
          {/* Currency / location banner */}
          <div className="pricing-location-bar">
            <span className="pricing-location-text">
              Prices shown in <strong>{pricing.currency}</strong> for{" "}
              <strong>{pricing.countryName}</strong>
            </span>
            <label htmlFor="pricing-country-select" className="pricing-location-label">
              Not your location?
            </label>
            <select
              id="pricing-country-select"
              className="pricing-country-select"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pricing-toggle" role="tablist" aria-label="Billing cycle">
            <button
              type="button"
              className={`pricing-toggle-option ${billing === "monthly" ? "is-active" : ""}`}
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`pricing-toggle-option ${billing === "annual" ? "is-active" : ""}`}
              onClick={() => setBilling("annual")}
              aria-pressed={billing === "annual"}
            >
              Annual
              <span className="pricing-save-pill">Save ~20%</span>
            </button>
          </div>

          <div className="pricing-stat-row">
            <div>
              <strong>No lesson commission</strong>
              <span>Keep tutor payments direct and predictable.</span>
            </div>
            <div>
              <strong>Upgrade anytime</strong>
              <span>Start free and move up when demand grows.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-section">
        <div className="pricing-section-head">
          <div>
            <h2>Subscription tiers</h2>
            <p className="section-lead">
              Pick the audience view to compare plans for tutors or students.
            </p>
          </div>
          <div className="pricing-audience-tabs" role="tablist" aria-label="Plan audience">
            <button
              type="button"
              className={`pricing-audience-tab ${audience === "tutors" ? "is-active" : ""}`}
              onClick={() => setAudience("tutors")}
              aria-pressed={audience === "tutors"}
            >
              For Tutors
            </button>
            <button
              type="button"
              className={`pricing-audience-tab ${audience === "students" ? "is-active" : ""}`}
              onClick={() => setAudience("students")}
              aria-pressed={audience === "students"}
            >
              For Students
            </button>
          </div>
        </div>

        <div className="pricing-cards" role="region" aria-label={`${audience} pricing plans`}>
          {plans[audience].map((plan) => {
            const price = displayPrice(plan);
            const period = plan.isFree ? "" : billing === "monthly" ? "/mo" : "/yr";

            return (
              <article
                key={`${audience}-${plan.name}`}
                className={`pricing-card ${plan.featured ? "is-featured" : ""}`}
              >
                {plan.featured ? (
                  <span className="pricing-card-badge">Most Popular</span>
                ) : null}

                <div className="pricing-card-top">
                  <p className="pricing-plan-name">{plan.name}</p>
                  <div className="pricing-plan-price">
                    <span>{price}</span>
                    {period ? <small>{period}</small> : null}
                  </div>
                  <p className="pricing-plan-note">
                    {billing === "monthly" || plan.isFree
                      ? "Cancel or upgrade as your needs change."
                      : annualNote(plan)}
                  </p>
                  <p className="pricing-plan-description">{plan.description}</p>
                </div>

                <ul className="pricing-feature-list">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`btn btn-block ${plan.featured ? "" : "btn-secondary"}`.trim()}
                >
                  {plan.cta}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pricing-section pricing-service-fees">
        <div className="pricing-section-head">
          <div>
            <h2>Service fees</h2>
            <p className="section-lead">
              These one-time charges only apply when a specific paid action happens on the
              platform. Shown in {pricing.currency}.
            </p>
          </div>
        </div>

        <div className="pricing-fee-grid">
          {[
            {
              key: "firstLesson",
              title: "First lesson booking fee",
              value: pricing.fees.firstLesson,
              description: "Charged to the student once per new tutor relationship.",
            },
            {
              key: "profileBoost",
              title: "Tutor profile boost",
              value: pricing.fees.profileBoost,
              description: "Seven days of featured placement for a tutor profile.",
            },
            {
              key: "pastPaperBundle",
              title: "Past paper bundle download",
              value: pricing.fees.pastPaperBundle,
              description: "Offline bundle of 20 papers for free plan users.",
            },
            {
              key: "groupClassListing",
              title: "Group class listing fee",
              value: pricing.fees.groupClassListing,
              description: "One-time charge per class posted by a tutor.",
            },
            {
              key: "resourceUpload",
              title: "Resource upload",
              value: pricing.fees.resourceUpload,
              description: "Per worksheet or notes upload for non-subscribers.",
            },
          ].map((fee) => (
            <article key={fee.key} className="pricing-fee-card">
              <p className="pricing-fee-price">
                {formatPrice(fee.value, pricing.currencySymbol)}
              </p>
              <h3>{fee.title}</h3>
              <p>{fee.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-section pricing-faq-section">
        <div className="pricing-section-head">
          <div>
            <h2>Frequently asked questions</h2>
            <p className="section-lead">
              A quick overview of how subscriptions and service fees work together.
            </p>
          </div>
        </div>

        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question} className="faq-item">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
