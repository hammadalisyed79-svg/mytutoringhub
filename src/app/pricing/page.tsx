import { auth } from "@/lib/auth";
import { formatPromoUntil, getLivePlans, getPlan, type ResolvedPlan } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { SubscribeButton } from "@/components/SubscribeButton";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { prisma } from "@/lib/prisma";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import Link from "next/link";
import type { CurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plans & Pricing – Student Pass and Tutor Subscriptions",
  description:
    "Affordable plans for students and tutors. Student Pass unlocks messaging; Tutor Basic lists your profile. No lesson commission — ever. Prices shown in your local currency.",
  alternates: { canonical: "/pricing" },
};

function PlanActions({
  plan,
  currency,
  signedIn,
  featured,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  signedIn: boolean;
  featured?: boolean;
}) {
  if (signedIn) {
    return (
      <SubscribeButton
        plan={plan.id}
        currency={currency}
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

function PlanPrice({ plan, currency }: { plan: ResolvedPlan; currency: CurrencyCode }) {
  if (plan.isComplimentary) {
    return (
      <div className="price-block">
        <div className="price">Complimentary</div>
        <p className="price-was">{formatPlanPrice(plan.listPricePkr, currency)}</p>
        <p className="plan-billing">
          Free until {formatPromoUntil(plan.promoEndsAt)}. Then {formatPlanPrice(plan.listPricePkr, currency)}.
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

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; state?: string; verify?: string; plan?: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const currency = await getVisitorCurrency();
  const allPlans = await getLivePlans();
  const sp = await searchParams;
  const visible = allPlans.filter((p) => {
    if (!role || role === "ADMIN") return true;
    if (role === "STUDENT") return p.audience === "student";
    return p.audience === "tutor";
  });
  const corePlans = visible.filter((p) => !p.isAddOn);
  const addOns = visible.filter((p) => p.isAddOn);
  const liveOffer = allPlans.find((p) => p.id === "TUTOR_BASIC" && p.isPromoActive);

  const me = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailVerified: true, email: true },
      })
    : null;
  const needsVerify =
    session?.user &&
    session.user.role !== "ADMIN" &&
    (sp.verify === "sent" || !me?.emailVerified);

  return (
    <div className="page checkout-page">
      <div className="container">
        <div className="checkout-hero">
          <div>
            <p className="eyebrow">Platform subscriptions</p>
            <h1 className="page-title">Plans & pricing</h1>
            <p className="section-lead">
              Prices shown in <strong>{currency}</strong>. There is no shopping cart — choose a plan
              and pay on Safepay in one step. Lesson fees stay off-platform.
            </p>
          </div>
          <ol className="checkout-steps" aria-label="Checkout steps">
            <li className={session?.user ? "is-done" : "is-current"}>1. Account</li>
            <li className={session?.user ? "is-current" : ""}>2. Choose plan</li>
            <li>3. Pay on Safepay</li>
          </ol>
        </div>

        {liveOffer && (
          <aside className="promo-banner">
            <strong>{liveOffer.promoLabel || "Limited offer"}</strong>
            <p>
              {liveOffer.promoNote ||
                `Tutor Basic is ${liveOffer.isComplimentary ? "complimentary" : "discounted"} until ${formatPromoUntil(liveOffer.promoEndsAt)}. Verified badge, highlight, and ad boost remain paid.`}
            </p>
          </aside>
        )}

        <div className="checkout-trust-bar">
          <span>256-bit encrypted checkout</span>
          <span>Email confirmation</span>
          <span>Works worldwide</span>
          <span>No cart — one-click plan checkout</span>
        </div>

        <CheckoutNotice
          checkout={sp.checkout}
          state={sp.state}
          planLabel={sp.plan ? getPlan(sp.plan)?.name || sp.plan : undefined}
        />

        {needsVerify && (
          <div className="panel checkout-verify">
            <p style={{ marginTop: 0 }}>
              {sp.verify === "sent"
                ? `We tried to send a confirmation to ${me?.email || "your email"} from admin@mytutoringhub.com.`
                : "Verify your email to unlock messaging, ads, and the study assistant."}{" "}
              Check inbox, junk, and promotions. Hotmail can delay mail by several minutes.
            </p>
            <ResendVerificationButton email={me?.email || undefined} />
          </div>
        )}

        {!session?.user && (
          <p className="muted" style={{ marginBottom: "1.25rem" }}>
            Join free, then pay on Safepay from the plan you pick. Signed-in accounts never go
            back to register — checkout starts here.
          </p>
        )}

        <section>
          <h2 className="checkout-section-title">Core plans</h2>
          <div className="pricing-grid">
            {corePlans.map((plan) => (
              <article
                key={plan.id}
                className={`plan ${plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC" ? "plan-featured" : ""}`}
              >
                <div className="plan-body">
                  {plan.isPromoActive ? (
                    <span className="plan-badge">{plan.promoLabel || "Limited offer"}</span>
                  ) : (
                    (plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC") && (
                      <span className="plan-badge">Most popular</span>
                    )
                  )}
                  <h3>{plan.name}</h3>
                  <p className="muted">{plan.description}</p>
                  <PlanPrice plan={plan} currency={currency} />
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
                    signedIn={Boolean(session?.user)}
                    featured={plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC"}
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
              Optional. These are not included in a complimentary Tutor Basic listing — Verified
              badge, highlight, boost, and extra ads are billed separately on Safepay.
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
                    <PlanPrice plan={plan} currency={currency} />
                    <ul>
                      {plan.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="plan-cta">
                    <PlanActions plan={plan} currency={currency} signedIn={Boolean(session?.user)} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
