import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlanBanner } from "@/components/PlanBanner";
import { ProfileBoostPanel } from "@/components/ProfileBoostPanel";
import { LaunchOfferBlock } from "@/components/LaunchOfferBlock";
import { getPlanDashboardSummary } from "@/lib/plan-limits";
import { getLivePlan } from "@/lib/plans";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import type { Role } from "@/lib/types";

export const metadata = { title: "Your plan" };
export const dynamic = "force-dynamic";

export default async function TutorPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard/tutor/plan");
  if (session.user.role === "STUDENT") redirect("/dashboard/student/plan");
  if (session.user.role === "ADMIN") redirect("/admin");

  const profileCountry = await prisma.tutorProfile
    .findUnique({
      where: { userId: session.user.id },
      select: { country: true },
    })
    .then((p) => p?.country)
    .catch(() => null);

  const [summary, currency, tutorProPlan] = await Promise.all([
    getPlanDashboardSummary(session.user.id, session.user.role as Role),
    getVisitorCurrency({ preferCountryCode: profileCountry }),
    getLivePlan("TUTOR_BASIC"),
  ]);
  const paidCheckoutLive = isPaidCheckoutLive();
  const showLaunchOffer =
    summary.planTier === "free" &&
    tutorProPlan &&
    tutorProPlan.isPromoActive &&
    tutorProPlan.isComplimentary;

  return (
    <div className="page">
      <div className="container narrow-prose">
        <header className="panel page-hero">
          <div className="page-hero-copy">
            <h1 className="page-title">Your plan</h1>
            <p className="muted">{summary.upgradeHint}</p>
          </div>
        </header>
        <PlanBanner
          role="TUTOR"
          planName={summary.planName}
          planTier={summary.planTier}
          usageUsed={summary.usageUsed}
          usageLimit={summary.usageLimit}
          usageLabel={summary.usageLabel}
          renewsOn={summary.renewsOn}
        />
        {showLaunchOffer ? (
          <div style={{ marginTop: "1.25rem" }}>
            <LaunchOfferBlock
              plan={tutorProPlan}
              currency={currency}
              signedIn
              paidCheckoutLive={paidCheckoutLive}
              variant="compact"
            />
          </div>
        ) : null}
        <div style={{ marginTop: "1.25rem" }}>
          <ProfileBoostPanel currency={currency} compact />
        </div>
        <section className="panel panel-actions" style={{ marginTop: "1.25rem" }}>
          <h2 className="panel-actions-title">Manage plan</h2>
          <div className="panel-actions-row">
            <Link href={summary.planTier === "free" ? "/pricing?plan=TUTOR_BASIC" : "/pricing"} className="btn">
              {summary.planTier === "free" ? "View plans" : "Tutor add-ons"}
            </Link>
            <Link href="/dashboard/tutor" className="btn btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
