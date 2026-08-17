import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { SubscribeButton } from "@/components/SubscribeButton";
import Link from "next/link";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const session = await auth();
  const role = session?.user?.role;
  const currency = await getVisitorCurrency();
  const visible = PLANS.filter((p) => {
    if (!role || role === "ADMIN") return true;
    if (role === "STUDENT") return p.audience === "student";
    return p.audience === "tutor";
  });

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Subscriptions</h1>
        <p className="section-lead">
          Platform plans shown in your local currency ({currency}). Lesson fees are paid directly to
          tutors — we never take a lesson commission.
        </p>
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
