import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PlanBanner } from "@/components/PlanBanner";
import { getPlanDashboardSummary } from "@/lib/plan-limits";
import type { Role } from "@/lib/types";

export const metadata = { title: "Your plan" };
export const dynamic = "force-dynamic";

export default async function StudentPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard/student/plan");
  if (session.user.role === "TUTOR") redirect("/dashboard/tutor/plan");
  if (session.user.role === "ADMIN") redirect("/admin");

  const summary = await getPlanDashboardSummary(session.user.id, session.user.role as Role);

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
          role="STUDENT"
          planName={summary.planName}
          planTier={summary.planTier}
          usageUsed={summary.usageUsed}
          usageLimit={summary.usageLimit}
          usageLabel={summary.usageLabel}
          renewsOn={summary.renewsOn}
        />
        <section className="panel panel-actions" style={{ marginTop: "1.25rem" }}>
          <h2 className="panel-actions-title">Manage plan</h2>
          <div className="panel-actions-row">
            <Link href="/pricing" className="btn">
              {summary.planTier === "free" ? "Upgrade plan" : "View pricing"}
            </Link>
            <Link href="/dashboard/student" className="btn btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
