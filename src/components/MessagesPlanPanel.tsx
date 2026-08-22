import Link from "next/link";
import { PlanBanner } from "@/components/PlanBanner";
import { SubscribeButton } from "@/components/SubscribeButton";
import { getPlanDashboardSummary, STUDENT_FREE_CONTACT_LIMIT } from "@/lib/plan-limits";
import { getLivePlans } from "@/lib/plans";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import type { ResolvedPlan } from "@/lib/plans";
import type { Role } from "@/lib/types";

function CompactPlanCard({
  plan,
  currency,
  featured,
  paidCheckoutLive,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  featured?: boolean;
  paidCheckoutLive: boolean;
}) {
  const price = plan.isPromoActive ? plan.chargePricePkr : plan.listPricePkr;

  return (
    <article className={`plan plan-compact${featured ? " plan-featured" : ""}`}>
      <div className="plan-body">
        {(plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC") && (
          <span className="plan-badge">Recommended</span>
        )}
        {plan.id === "STUDENT_PRO" && <span className="plan-badge">Includes AI</span>}
        <h3>{plan.name}</h3>
        <p className="muted">{plan.description}</p>
        <div className="price-block">
          <div className="price">{formatPlanPrice(price, currency)}</div>
          <p className="plan-billing muted">Per month · shown in {currency}</p>
        </div>
        <ul>
          {plan.features.slice(0, 3).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      <div className="plan-cta">
        <SubscribeButton
          plan={plan.id}
          planLabel={plan.name}
          currency={currency}
          label={
            plan.isComplimentary
              ? `Activate ${plan.name} free`
              : `Pay with Safepay · ${plan.name}`
          }
          featured={featured}
          complimentary={plan.isComplimentary}
          paidCheckoutLive={paidCheckoutLive}
        />
      </div>
    </article>
  );
}

/**
 * Messaging flow:
 * - Free + contacts left → banner with "X of 3 left" only (no checkout wall)
 * - Free + 0 left → show Student Pass upgrade
 * - Student Pass / Pro → banner only (unlimited); no messaging paywall
 */
export async function MessagesPlanPanel({
  userId,
  role,
  composing = false,
}: {
  userId: string;
  role: Role;
  /** True when opening a new message to someone — keep UI focused on compose */
  composing?: boolean;
}) {
  if (role === "ADMIN") return null;

  const [summary, currency, plans, paidCheckoutLive] = await Promise.all([
    getPlanDashboardSummary(userId, role),
    getVisitorCurrency(),
    getLivePlans(),
    Promise.resolve(isPaidCheckoutLive()),
  ]);

  const audience = role === "TUTOR" ? "tutor" : "student";
  const corePlans = plans.filter((p) => !p.isAddOn && p.audience === audience);

  const freeLimitExhausted =
    summary.planTier === "free" &&
    summary.usageLimit > 0 &&
    summary.usageUsed >= summary.usageLimit;

  const remaining =
    summary.usageLimit > 0
      ? Math.max(0, summary.usageLimit - summary.usageUsed)
      : summary.usageLimit < 0
        ? null
        : 0;

  // Only sell messaging when free quota is gone. Never wall Student Pass with Pro here.
  let checkoutPlans: ResolvedPlan[] = [];
  if (role === "STUDENT" && freeLimitExhausted) {
    checkoutPlans = corePlans.filter((p) => p.id === "STUDENT_PASS" || p.id === "STUDENT_PRO");
  } else if (role === "TUTOR" && freeLimitExhausted) {
    checkoutPlans = corePlans.filter((p) => p.id === "TUTOR_BASIC");
  }

  const heading =
    role === "STUDENT" ? "You've used your free contacts" : "Monthly enquiry limit reached";
  const lead =
    role === "STUDENT"
      ? `Free accounts include ${STUDENT_FREE_CONTACT_LIMIT} new tutor contacts per month. Upgrade to Student Pass for unlimited messaging.`
      : "Tutor Basic removes the monthly cap when you contact students first.";

  // While composing a new message and still allowed to send, keep the page focused.
  if (composing && !freeLimitExhausted) {
    return (
      <section className="panel messages-plan-panel messages-plan-panel-compact">
        <PlanBanner
          role={role}
          planName={summary.planName}
          planTier={summary.planTier}
          usageUsed={summary.usageUsed}
          usageLimit={summary.usageLimit}
          usageLabel={summary.usageLabel}
          renewsOn={summary.renewsOn}
        />
        {role === "STUDENT" && summary.planTier === "free" && remaining != null && (
          <p className="muted messages-plan-foot" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
            {remaining} free tutor contact{remaining === 1 ? "" : "s"} left this month. After that,
            upgrade to <Link href="/pricing?plan=STUDENT_PASS">Student Pass</Link> for unlimited
            messaging.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="panel messages-plan-panel">
      <PlanBanner
        role={role}
        planName={summary.planName}
        planTier={summary.planTier}
        usageUsed={summary.usageUsed}
        usageLimit={summary.usageLimit}
        usageLabel={summary.usageLabel}
        renewsOn={summary.renewsOn}
      />

      {role === "STUDENT" && summary.planTier === "free" && !freeLimitExhausted && remaining != null && (
        <p className="muted messages-plan-foot" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          {remaining} of {summary.usageLimit} free tutor contacts left this month.{" "}
          <Link href="/pricing?plan=STUDENT_PASS">Get unlimited with Student Pass</Link>
        </p>
      )}

      {checkoutPlans.length > 0 && (
        <div className="messages-plan-checkout">
          <h2>{heading}</h2>
          <p className="muted messages-plan-lead">{lead}</p>
          <div className="messages-plan-grid">
            {checkoutPlans.map((plan) => (
              <CompactPlanCard
                key={plan.id}
                plan={plan}
                currency={currency}
                featured={plan.id === "STUDENT_PASS" || plan.id === "TUTOR_BASIC"}
                paidCheckoutLive={paidCheckoutLive}
              />
            ))}
          </div>
          <p className="muted messages-plan-foot">
            {paidCheckoutLive
              ? "Encrypted Safepay checkout · Receipt emailed · "
              : "Manual activation by email until card checkout is live · "}
            <Link href="/pricing">Compare all plans</Link>
            {role === "STUDENT" && (
              <>
                {" · "}
                <Link href="/dashboard/student/plan">Plan details</Link>
              </>
            )}
            {role === "TUTOR" && (
              <>
                {" · "}
                <Link href="/dashboard/tutor/plan">Plan details</Link>
              </>
            )}
          </p>
        </div>
      )}

      {checkoutPlans.length === 0 && summary.planTier !== "free" && !composing && (
        <p className="muted messages-plan-foot" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
          {summary.upgradeHint}{" "}
          <Link href="/pricing">View pricing</Link>
        </p>
      )}
    </section>
  );
}
