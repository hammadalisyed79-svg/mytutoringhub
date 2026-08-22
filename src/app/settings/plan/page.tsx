import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PlanBanner } from "@/components/PlanBanner";
import { getPlanDashboardSummary } from "@/lib/plan-limits";
import type { Role } from "@/lib/types";

export const metadata = { title: "Plan & usage" };
export const dynamic = "force-dynamic";

export default async function SettingsPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/settings/plan");
  if (session.user.role === "ADMIN") redirect("/admin");

  const role = session.user.role as Role;
  const summary = await getPlanDashboardSummary(session.user.id, role);

  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Plan & usage</h1>
        <p className="section-lead">{summary.upgradeHint}</p>
        <PlanBanner
          role={role === "TUTOR" ? "TUTOR" : "STUDENT"}
          planName={summary.planName}
          planTier={summary.planTier}
          usageUsed={summary.usageUsed}
          usageLimit={summary.usageLimit}
          usageLabel={summary.usageLabel}
          renewsOn={summary.renewsOn}
        />
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/pricing" className="btn">
            {summary.planTier === "free" ? "Upgrade plan" : "Manage on pricing"}
          </Link>{" "}
          <Link href="/settings" className="btn btn-secondary" style={{ marginLeft: "0.5rem" }}>
            Account settings
          </Link>
        </p>
      </div>
    </div>
  );
}
