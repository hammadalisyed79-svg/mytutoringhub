import Link from "next/link";
import { PlanBanner } from "@/components/PlanBanner";
import { getPlanDashboardSummary } from "@/lib/plan-limits";
import { STUDENT_FREE_CONTACTS_LINE } from "@/lib/marketing-copy";
import type { Role } from "@/lib/types";

export async function SearchStudentBanner({ userId, role }: { userId: string; role: Role }) {
  if (role !== "STUDENT") return null;

  const summary = await getPlanDashboardSummary(userId, "STUDENT");
  const nearLimit =
    summary.usageLimit > 0 && summary.usageUsed >= Math.max(1, summary.usageLimit - 1);

  return (
    <div className="panel search-student-banner">
      <PlanBanner
        role="STUDENT"
        planName={summary.planName}
        planTier={summary.planTier}
        usageUsed={summary.usageUsed}
        usageLimit={summary.usageLimit}
        usageLabel={summary.usageLabel}
        renewsOn={summary.renewsOn}
      />
      {summary.planTier === "free" && (
        <p className="muted search-student-hint">
          {STUDENT_FREE_CONTACTS_LINE}
          {nearLimit && (
            <>
              {" "}
              <Link href="/pricing">Upgrade to Student Pass</Link> before your limit resets.
            </>
          )}
        </p>
      )}
    </div>
  );
}
