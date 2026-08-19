"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BillingCycle = "monthly" | "annual";
type AudienceKey = "tutors" | "students";

type Plan = {
  name: string;
  monthly: string;
  annual: string;
  annualNote: string;
  description: string;
  benefits: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

type ServiceFee = {
  title: string;
  price: string;
  description: string;
};

const tutorPlans: Plan[] = [
  {
    name: "Free Starter",
    monthly: "£0",
    annual: "£0",
    annualNote: "No annual charge",
    description: "Best for getting listed and testing demand.",
    benefits: [
      "Profile listing",
      "5 enquiry reveals per month",
      "Appear in tutor search",
    ],
    cta: "Get Started Free",
    href: "/register?role=tutor",
  },
  {
    name: "Pro Tutor",
    monthly: "£9.99",
    annual: "£95.88",
    annualNote: "Equivalent to £7.99/mo, billed yearly",
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
    name: "Elite Tutor",
    monthly: "£19.99",
    annual: "£191.88",
    annualNote: "Equivalent to £15.99/mo, billed yearly",
    description: "Extra visibility and early access for top-performing tutors.",
    benefits: [
      "Everything in Pro Tutor",
      "Featured placement",
      "Homepage spotlight rotation",
      "Early access to new subjects and past papers",
    ],
    cta: "Upgrade Now",
    href: "/register?role=tutor",
  },
];

const studentPlans: Plan[] = [
  {
    name: "Free",
    monthly: "£0",
    annual: "£0",
    annualNote: "No annual charge",
    description: "Browse tutors and access essentials before upgrading.",
    benefits: [
      "Search tutors",
      "3 tutor contacts per month",
      "Access free past papers",
    ],
    cta: "Get Started Free",
    href: "/register?role=student",
  },
  {
    name: "Study Plus",
    monthly: "£4.99",
    annual: "£47.88",
    annualNote: "Equivalent to £3.99/mo, billed yearly",
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
    name: "Study Pro",
    monthly: "£9.99",
    annual: "£95.88",
    annualNote: "Equivalent to £7.99/mo, billed yearly",
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
];

const serviceFees: ServiceFee[] = [
  {
    title: "First lesson booking fee",
    price: "£1.99",
    description: "Charged to the student once per new tutor relationship.",
  },
  {
    title: "Tutor profile boost",
    price: "£4.99",
    description: "Seven days of featured placement for a tutor profile.",
  },
  {
    title: "Past paper bundle download",
    price: "£0.99",
    description: "Offline bundle of 20 papers for free plan users.",
  },
  {
    title: "Group class listing fee",
    price: "£2.99",
    description: "One-time charge per class posted by a tutor.",
  },
  {
    title: "Resource upload",
    price: "£1.49",
    description: "Per worksheet or notes upload for non-subscribers.",
  },
];

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

export function PricingPlans() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [audience, setAudience] = useState<AudienceKey>("tutors");

  const plans = useMemo(
    () => ({
      tutors: tutorPlans,
      students: studentPlans,
    }),
    [],
  );

  return (
    <div className="pricing-shell stack-lg">
      <section className="pricing-hero">
        <div className="pricing-hero-copy">
          <p className="eyebrow">Simple marketplace pricing</p>
          <h1 className="pricing-title">Pricing that grows with tutors and students</h1>
          <p className="pricing-lead">
            Choose a plan built for how you use MyTutoringHub. Subscriptions unlock visibility,
            tools, and contact limits, while one-time service fees only apply when you trigger a
            paid event.
          </p>
        </div>

        <div className="pricing-control-card">
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
            const price = billing === "monthly" ? plan.monthly : plan.annual;
            const period = billing === "monthly" ? "/mo" : "/yr";

            return (
              <article
                key={`${audience}-${plan.name}`}
                className={`pricing-card ${plan.featured ? "is-featured" : ""}`}
              >
                {plan.featured ? <span className="pricing-card-badge">Most popular</span> : null}

                <div className="pricing-card-top">
                  <p className="pricing-plan-name">{plan.name}</p>
                  <div className="pricing-plan-price">
                    <span>{price}</span>
                    <small>{period}</small>
                  </div>
                  <p className="pricing-plan-note">
                    {billing === "monthly"
                      ? "Cancel or upgrade as your needs change."
                      : plan.annualNote}
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
              These one-time charges only apply when a specific paid action happens on the platform.
            </p>
          </div>
        </div>

        <div className="pricing-fee-grid">
          {serviceFees.map((fee) => (
            <article key={fee.title} className="pricing-fee-card">
              <p className="pricing-fee-price">{fee.price}</p>
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
