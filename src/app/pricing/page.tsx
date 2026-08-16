import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import Link from "next/link";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const session = await auth();
  const role = session?.user?.role;
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
          Platform access is subscription-based. Lesson fees are paid directly between tutor and
          student — MyTutoringHub never takes a commission on lessons.
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
              <div className="price">{plan.priceLabel}</div>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {session?.user ? (
                <SubscribeButton plan={plan.id} label={`Get ${plan.name}`} />
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
