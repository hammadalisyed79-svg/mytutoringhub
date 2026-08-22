import Link from "next/link";
import { PlanBanner } from "@/components/PlanBanner";
import { SubscribeButton } from "@/components/SubscribeButton";
import { getPlanDashboardSummary, STUDENT_FREE_CONTACT_LIMIT } from "@/lib/plan-limits";
import { getLivePlans } from "@/lib/plans";
import { formatPlanPrice, type CurrencyCode } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import type { ResolvedPlan } from "@/lib/plans";
import type { Role } from "@/lib/types";

function CompactPlanCard({
  plan,
  currency,
  featured,
}: {
  plan: ResolvedPlan;
  currency: CurrencyCode;
  featured?: boolean;
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
          currency={currency}
          label={`Pay with Safepay · ${plan.name}`}
          featured={featured}
        />
      </div>
    </article>
  );
}

export async function MessagesPlanPanel({ userId, role }: { userId: string; role: Role }) {
  if (role === "ADMIN") return null;

  const [summary, currency, plans] = await Promise.all([
    getPlanDashboardSummary(userId, role),
    getVisitorCurrency(),
    getLivePlans(),
  ]);

  const audience = role === "TUTOR" ? "tutor" : "student";
  const corePlans = plans.filter((p) => !p.isAddOn && p.audience === audience);

  let checkoutPlans: ResolvedPlan[] = [];
  if (role === "STUDENT") {
    if (summary.planTier === "free") {
      checkoutPlans = corePlans.filter((p) => p.id === "STUDENT_PASS" || p.id === "STUDENT_PRO");
    } else if (summary.planName === "Student Pass") {
      checkoutPlans = corePlans.filter((p) => p.id === "STUDENT_PRO");
    }
  } else if (summary.planTier === "free") {
    checkoutPlans = corePlans.filter((p) => p.id === "TUTOR_BASIC");
  }

  const heading =
    role === "STUDENT" ? "Buy messaging access" : "Unlock unlimited student replies";
  const lead =
    role === "STUDENT"
      ? summary.planTier === "free"
        ? `Free accounts include ${STUDENT_FREE_CONTACT_LIMIT} new tutor contacts per month. Student Pass unlocks unlimited messaging — no cart needed, checkout starts here.`
        : "Student Pro adds the AI study assistant on top of unlimited tutor contacts."
      : "Listed tutors receive messages anytime. Tutor Basic removes the monthly cap when you contact students first.";

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
              />
            ))}
          </div>
          <p className="muted messages-plan-foot">
            Encrypted Safepay checkout · Receipt emailed ·{" "}
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

      {checkoutPlans.length === 0 && summary.planTier !== "free" && (
        <p className="muted messages-plan-foot" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
          {summary.upgradeHint}{" "}
          <Link href="/pricing">View pricing</Link>
        </p>
      )}
    </section>
  );
}
