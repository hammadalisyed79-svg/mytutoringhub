import Link from "next/link";
import { getPlan } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";
import { STUDENT_FREE_CONTACTS_LINE } from "@/lib/marketing-copy";
import { manualActivationCtaLabel } from "@/lib/payments-status";

type PlanSubscription = {
  id: string;
  plan: string;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
};

function planVisual(planId: string) {
  switch (planId) {
    case "STUDENT_PASS":
      return { icon: "◇", eyebrow: "Student Pass" };
    case "STUDENT_PRO":
      return { icon: "✦", eyebrow: "Student Pro" };
    default:
      return { icon: "◆", eyebrow: "Membership" };
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

export function StudentPlanPanel({
  corePlan,
  pendingSubs,
  currency,
  paidCheckoutLive,
  hubPointsBalance = 0,
  listPricePkr,
}: {
  corePlan: PlanSubscription | undefined;
  pendingSubs: PlanSubscription[];
  currency: string;
  paidCheckoutLive: boolean;
  hubPointsBalance?: number;
  listPricePkr?: number;
}) {
  return (
    <section className="tutor-plan-wallet" aria-labelledby="student-plan-heading">
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
            <h2 className="tutor-plan-title" id="student-plan-heading">
              Your plan
            </h2>
            <p className="tutor-plan-lead">
              {corePlan
                ? "Your Student Pass benefits are active on this account"
                : `${STUDENT_FREE_CONTACTS_LINE} Upgrade for unlimited contacts and study tools.`}
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
            {(() => {
              const name = getPlan(corePlan.plan as never)?.name || corePlan.plan;
              const visual = planVisual(corePlan.plan);
              return (
                <li className="tutor-plan-item">
                  <span className="tutor-plan-item-icon" aria-hidden>
                    {visual.icon}
                  </span>
                  <div className="tutor-plan-item-copy">
                    <span className="tutor-plan-item-eyebrow">{visual.eyebrow}</span>
                    <strong className="tutor-plan-item-name">{name}</strong>
                    <span className="tutor-plan-item-renewal">
                      Renews {formatRenewal(corePlan.currentPeriodEnd)}
                    </span>
                  </div>
                  <Link className="tutor-plan-item-slip" href={`/receipt/${corePlan.id}`}>
                    View slip
                  </Link>
                </li>
              );
            })()}
          </ul>
        ) : (
          <div className="tutor-plan-empty">
            <p>
              {STUDENT_FREE_CONTACTS_LINE} Student Pro adds unlimited past papers and the AI study
              assistant.
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
              plan="STUDENT_PASS"
              planLabel="Student Pass"
              currency={currency}
              label={
                paidCheckoutLive
                  ? "Pay with Safepay · Student Pass"
                  : manualActivationCtaLabel("Student Pass")
              }
              featured
              paidCheckoutLive={paidCheckoutLive}
              hubPointsBalance={hubPointsBalance}
              listPricePkr={listPricePkr}
            />
          </div>
        ) : null}

        <div className="tutor-plan-foot">
          <Link href="/dashboard/student/plan">Plan details</Link>
          <span aria-hidden>·</span>
          <Link href="/pricing">See all plans</Link>
        </div>

        {!corePlan ? <RecoverPaymentForm /> : null}
      </div>
    </section>
  );
}
