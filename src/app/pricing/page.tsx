import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { SubscribeButton } from "@/components/SubscribeButton";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { prisma } from "@/lib/prisma";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import Link from "next/link";

export const metadata = { title: "Pricing" };

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; state?: string; verify?: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const currency = await getVisitorCurrency();
  const sp = await searchParams;
  const visible = PLANS.filter((p) => {
    if (!role || role === "ADMIN") return true;
    if (role === "STUDENT") return p.audience === "student";
    return p.audience === "tutor";
  });

  const needsVerify =
    session?.user &&
    session.user.role !== "ADMIN" &&
    (sp.verify === "sent" ||
      !(await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailVerified: true },
      }))?.emailVerified);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Subscriptions</h1>
        <p className="section-lead">
          Platform plans shown in your local currency ({currency}) are billed through Safepay.
          Lesson fees stay off-platform between you and the other party — we never take a lesson
          commission.
        </p>
        <CheckoutNotice checkout={sp.checkout} state={sp.state} />
        {needsVerify && (
          <div
            className="panel"
            style={{
              marginTop: "1rem",
              marginBottom: "1rem",
              borderColor: "var(--brand)",
              background: "rgba(15, 90, 70, 0.06)",
            }}
          >
            <p style={{ marginTop: 0 }}>
              {sp.verify === "sent"
                ? "We sent a verification link to your email. Confirm it to message, post ads, and use the study assistant."
                : "Verify your email to unlock messaging, ads, and the study assistant."}{" "}
              Check spam if you do not see it.
            </p>
            <ResendVerificationButton />
          </div>
        )}
        {!session?.user && (
          <p className="muted" style={{ marginBottom: "1.25rem" }}>
            <Link href="/register">Create an account</Link> to subscribe.
          </p>
        )}
        <div className="pricing-grid">
          {visible.map((plan) => (
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
                  label={`Get ${plan.name}`}
                />
              ) : (
                <Link href="/register" className="btn">
                  Join to subscribe
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
