import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlanBanner } from "@/components/PlanBanner";
import { ProfileBoostPanel } from "@/components/ProfileBoostPanel";
import { getPlanDashboardSummary } from "@/lib/plan-limits";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import type { Role } from "@/lib/types";

export const metadata = { title: "Your plan" };
export const dynamic = "force-dynamic";

export default async function TutorPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard/tutor/plan");
  if (session.user.role === "STUDENT") redirect("/dashboard/student/plan");
  if (session.user.role === "ADMIN") redirect("/admin");

  const summary = await getPlanDashboardSummary(session.user.id, session.user.role as Role);
  const currency = await getVisitorCurrency();
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { boostUntil: true },
  });

  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Your plan</h1>
        <p className="section-lead">{summary.upgradeHint}</p>
        <PlanBanner
          role="TUTOR"
          planName={summary.planName}
          planTier={summary.planTier}
          usageUsed={summary.usageUsed}
          usageLimit={summary.usageLimit}
          usageLabel={summary.usageLabel}
          renewsOn={summary.renewsOn}
        />
        {tutorProfile && (
          <div style={{ marginTop: "1.25rem" }}>
            <ProfileBoostPanel boostUntil={tutorProfile.boostUntil} currency={currency} compact />
          </div>
        )}
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/pricing" className="btn">
            {summary.planTier === "free" ? "Upgrade plan" : "Tutor add-ons"}
          </Link>{" "}
          <Link href="/dashboard/tutor" className="btn btn-secondary" style={{ marginLeft: "0.5rem" }}>
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
