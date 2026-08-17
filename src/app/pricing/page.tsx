import { auth } from "@/lib/auth";
import { getLivePlans } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { SubscribeButton } from "@/components/SubscribeButton";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { prisma } from "@/lib/prisma";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import Link from "next/link";

export const metadata = { title: "Plans & pricing" };

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; state?: string; verify?: string }>;
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

  const needsVerify =
    session?.user &&
    session.user.role !== "ADMIN" &&
    (sp.verify === "sent" ||
      !(await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailVerified: true },
      }))?.emailVerified);

  return (
    <div className="page checkout-page">
      <div className="container">
        <div className="checkout-hero">
          <div>
            <p className="eyebrow">Platform subscriptions</p>
            <h1 className="page-title">Plans & pricing</h1>
            <p className="section-lead">
              Prices shown in <strong>{currency}</strong>. Secure checkout via Safepay with email
              receipt. Lesson fees stay off-platform — we never take a lesson commission.
            </p>
          </div>
          <ol className="checkout-steps" aria-label="Checkout steps">
            <li className={session?.user ? "is-done" : "is-current"}>1. Account</li>
            <li className={session?.user ? "is-current" : ""}>2. Choose plan</li>
            <li>3. Secure payment</li>
          </ol>
        </div>

        <div className="checkout-trust-bar">
          <span>256-bit encrypted checkout</span>
          <span>Email receipt on success</span>
          <span>Works worldwide</span>
          <span>Cancel before renewal</span>
        </div>

        <CheckoutNotice checkout={sp.checkout} state={sp.state} />

        {needsVerify && (
          <div className="panel checkout-verify">
            <p style={{ marginTop: 0 }}>
              {sp.verify === "sent"
                ? "We sent a confirmation email. Verify your address to unlock messaging, ads, and the study assistant."
                : "Verify your email to unlock messaging, ads, and the study assistant."}{" "}
              Check spam if you do not see it.
            </p>
            <ResendVerificationButton />
          </div>
        )}

        {!session?.user && (
          <div className="panel checkout-guest">
            <p style={{ marginTop: 0 }}>
              <Link href="/register" className="btn btn-sm">
                Create account
              </Link>{" "}
              or <Link href="/login">sign in</Link> to subscribe. Google sign-in is available.
            </p>
          </div>
        )}

        <section>
          <h2 className="checkout-section-title">Core plans</h2>
          <div className="pricing-grid">
            {corePlans.map((plan) => (
              <article
                key={plan.id}
                className={`plan ${plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC" ? "plan-featured" : ""}`}
              >
                {(plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC") && (
                  <span className="plan-badge">Most popular</span>
                )}
                <h3>{plan.name}</h3>
                <p className="muted">{plan.description}</p>
                <div className="price">{formatPlanPrice(plan.pricePkr, currency)}</div>
                <p className="plan-billing muted">Billed monthly · shown in {currency}</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {session?.user ? (
                  <SubscribeButton
                    plan={plan.id}
                    currency={currency}
                    label={`Continue with ${plan.name}`}
                    featured={plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC"}
                  />
                ) : (
                  <Link href="/register" className="btn btn-block">
                    Create account to subscribe
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        {addOns.length > 0 && (
          <section style={{ marginTop: "2rem" }}>
            <h2 className="checkout-section-title">Tutor add-ons</h2>
            <div className="pricing-grid">
              {addOns.map((plan) => (
                <article key={plan.id} className="plan">
                  <h3>{plan.name}</h3>
                  <p className="muted">{plan.description}</p>
                  <div className="price">{formatPlanPrice(plan.pricePkr, currency)}</div>
                  <ul>
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {session?.user ? (
                    <SubscribeButton
                      plan={plan.id}
                      currency={currency}
                      label={`Add ${plan.name}`}
                    />
                  ) : (
                    <Link href="/register?role=tutor" className="btn btn-secondary btn-block">
                      Join as tutor
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
