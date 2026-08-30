import Link from "next/link";
import { getPlan } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";

type PlanSubscription = {
  id: string;
  plan: string;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
};

function planVisual(planId: string) {
  switch (planId) {
    case "TUTOR_BASIC":
      return { icon: "◇", eyebrow: "Core membership" };
    case "VERIFIED_TUTOR":
      return { icon: "✦", eyebrow: "Trust & verification" };
    case "HIGHLIGHTED_AD":
      return { icon: "◆", eyebrow: "Visibility boost" };
    default:
      return { icon: "◆", eyebrow: "Tutor add-on" };
  }
}

function formatRenewal(date: Date | null) {
  if (!date) return "Active";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TutorPlanPanel({
  corePlan,
  addOnSubs,
  pendingSubs,
  currency,
  paidCheckoutLive,
}: {
  corePlan: PlanSubscription | undefined;
  addOnSubs: PlanSubscription[];
  pendingSubs: PlanSubscription[];
  currency: string;
  paidCheckoutLive: boolean;
}) {
  const activePlans = corePlan
    ? [
        corePlan,
        ...addOnSubs.filter((sub) => sub.id !== corePlan.id),
      ]
    : [];

  return (
    <section className="tutor-plan-wallet" aria-labelledby="tutor-plan-heading">
      <div className="tutor-plan-hero">
        <div className="tutor-plan-hero-glow" aria-hidden />
        <div className="tutor-plan-hero-inner">
          <div className="tutor-plan-hero-copy">
            <p className="tutor-plan-kicker">
              <span className="tutor-plan-kicker-icon" aria-hidden>
                ✦
              </span>
              Membership
            </p>
            <h2 className="tutor-plan-title" id="tutor-plan-heading">
              Your plan
            </h2>
            <p className="tutor-plan-lead">
              {corePlan
                ? `${activePlans.length} active benefit${activePlans.length === 1 ? "" : "s"} on your account`
                : "Complete your profile for free search visibility — upgrade when you are ready"}
            </p>
          </div>
          {corePlan ? (
            <span className="tutor-plan-status-pill">Active</span>
          ) : (
            <span className="tutor-plan-status-pill tutor-plan-status-pill--draft">Free tier</span>
          )}
        </div>
      </div>

      <div className="tutor-plan-body">
        {corePlan ? (
          <ul className="tutor-plan-list">
            {activePlans.map((sub) => {
              const name = getPlan(sub.plan as never)?.name || sub.plan;
              const visual = planVisual(sub.plan);
              return (
                <li key={sub.id} className="tutor-plan-item">
                  <span className="tutor-plan-item-icon" aria-hidden>
                    {visual.icon}
                  </span>
                  <div className="tutor-plan-item-copy">
                    <span className="tutor-plan-item-eyebrow">{visual.eyebrow}</span>
                    <strong className="tutor-plan-item-name">{name}</strong>
                    <span className="tutor-plan-item-renewal">
                      Renews {formatRenewal(sub.currentPeriodEnd)}
                    </span>
                  </div>
                  <Link className="tutor-plan-item-slip" href={`/receipt/${sub.id}`}>
                    View slip
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="tutor-plan-empty">
            <p>
              Complete your profile to appear in search for free with up to 3 Teaching Profiles.
              Tutor Pro unlocks relevance-first ranking, unlimited enquiry reveals, and up to 10
              Teaching Profiles.
            </p>
          </div>
        )}

        {pendingSubs.length > 0 ? (
          <div className="tutor-plan-pending">
            <p>
              {pendingSubs.length} unfinished checkout
              {pendingSubs.length === 1 ? "" : "s"}. If Safepay already charged you, confirm below.
            </p>
            <div className="tutor-plan-pending-actions">
              {pendingSubs
                .filter((s) => s.stripeSubscriptionId?.startsWith("track_"))
                .map((s) => (
                  <a
                    key={s.id}
                    className="btn btn-sm"
                    href={`/api/safepay/complete?tracker=${encodeURIComponent(s.stripeSubscriptionId!)}&plan=${encodeURIComponent(s.plan)}`}
                  >
                    Confirm {getPlan(s.plan as never)?.name || s.plan}
                  </a>
                ))}
            </div>
          </div>
        ) : null}

        {!corePlan ? (
          <div className="tutor-plan-cta">
            <SubscribeButton
              plan="TUTOR_BASIC"
              planLabel="Tutor Pro"
              currency={currency}
              label="Activate Tutor Pro free"
              complimentary
              paidCheckoutLive={paidCheckoutLive}
            />
          </div>
        ) : null}

        <div className="tutor-plan-foot">
          <Link href="/dashboard/tutor/plan">Plan details</Link>
          <span aria-hidden>·</span>
          <Link href="/pricing">Tutor add-ons</Link>
        </div>

        {!corePlan ? <RecoverPaymentForm /> : null}
      </div>
    </section>
  );
}
