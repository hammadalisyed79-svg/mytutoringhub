import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { PostVerifyStudentChecklist } from "@/components/PostVerifyChecklist";
import { StudentPlanPanel } from "@/components/StudentPlanPanel";
import { PointsWalletPanel } from "@/components/PointsWalletPanel";
import { StudentAdCard } from "@/components/StudentAdCard";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { ensureHubPointsFresh, getHubPointsSummary } from "@/lib/hub-points";
import { DashboardMessageAlert } from "@/components/DashboardMessageAlert";
import { getUnreadMessageSummary } from "@/lib/message-inbox";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { getPlan } from "@/lib/plans";
import { StudentDashboardShortcuts } from "@/components/StudentDashboardShortcuts";
import { SwitchProfileButton } from "@/components/SwitchProfileButton";
import {
  type DashboardSearchParams,
  prepareDashboardHome,
  roleDashboardPath,
  getDbUserRole,
} from "@/lib/dashboard-home";

export const metadata = { title: "Student dashboard" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard/student");
  const dbRole = (await getDbUserRole(session.user.id)) || session.user.role;
  if (dbRole === "ADMIN") redirect("/admin");
  if (dbRole === "TUTOR") {
    redirect(roleDashboardPath("TUTOR", await searchParams));
  }

  const sp = await searchParams;
  const paidCheckoutLive = isPaidCheckoutLive();
  const [{ user, currency, pendingSubs, corePlan }, inbox] = await Promise.all([
    prepareDashboardHome(session.user.id, "STUDENT", sp),
    getUnreadMessageSummary(session.user.id),
  ]);
  await ensureHubPointsFresh(session.user.id);
  const hubPoints = await getHubPointsSummary(session.user.id, { currency, role: "STUDENT" });
  const studentPassPlan = getPlan("STUDENT_PASS");
  const studentPassPricePkr = studentPassPlan?.pricePkr;

  return (
    <div className="page student-dashboard-page">
      <div className="container">
        <header className="panel page-hero student-dashboard-hero">
          <div className="page-hero-copy">
            <h1 className="page-title">Hi, {user.name}</h1>
            <p className="muted">
              Find a tutor, use free monthly contacts or a Student Pass, or post a request.
            </p>
          </div>
          <div className="page-hero-actions">
            <Link href="/messages" className="btn btn-sm">
              Messages{inbox.unread > 0 ? ` (${inbox.unread})` : ""}
            </Link>
            <Link href="/search" className="btn btn-secondary btn-sm">
              Search tutors
            </Link>
          </div>
        </header>

        {sp.verified === "1" ? <PostVerifyStudentChecklist /> : null}
        <CheckoutNotice
          checkout={sp.checkout}
          state={sp.state}
          planLabel={sp.plan ? getPlan(sp.plan as never)?.name || sp.plan : undefined}
        />
        <DashboardMessageAlert userId={session.user.id} />
        {sp.subscribed === "1" && sp.checkout !== "success" && (
          <p className="success panel student-dashboard-alert">
            Payment confirmed. Your plan is active
            {sp.plan ? ` (${getPlan(sp.plan as never)?.name || sp.plan})` : ""}.
          </p>
        )}

        <div className="student-dashboard-overview">
          <PointsWalletPanel summary={hubPoints} role="STUDENT" />

          <StudentPlanPanel
            corePlan={corePlan}
            pendingSubs={pendingSubs}
            currency={currency}
            paidCheckoutLive={paidCheckoutLive}
            hubPointsBalance={hubPoints.balance}
            listPricePkr={studentPassPricePkr}
          />
        </div>

        <StudentDashboardShortcuts unread={inbox.unread} />

        <div className="student-dashboard-stack">
          <section className="panel student-dashboard-find">
            <div className="student-dashboard-find-copy">
              <h2>Find a tutor</h2>
              <p className="muted section-lead-tight">
                Search by subject, level, and location — then message tutors that fit.
              </p>
            </div>
            <div className="student-dashboard-find-actions">
              <Link href="/search" className="btn btn-sm">
                Search tutors
              </Link>
              <Link href="/ads/new" className="btn btn-secondary btn-sm">
                Post a request
              </Link>
            </div>
          </section>

          <section className="panel">
            <h2>{user.tutorProfile ? "Your tutor profile" : "Want to teach?"}</h2>
            <p className="muted section-lead-tight">
              {user.tutorProfile
                ? "You already have a tutor profile on this login. Switch to tutor mode anytime — your Teaching Profiles stay saved."
                : "Keep this login and create a free tutor profile. You can switch back to student mode anytime without losing your tutor profile."}
            </p>
            {user.tutorProfile ? (
              <SwitchProfileButton
                target="TUTOR"
                label="Switch to tutor mode"
                className="btn btn-sm"
                busyLabel="Opening tutor dashboard…"
              />
            ) : (
              <Link href="/become-a-tutor" className="btn btn-secondary btn-sm">
                Become a tutor
              </Link>
            )}
          </section>

          <InviteTutorShare
            referrerId={session.user.id}
            referrerName={session.user.name}
            compact
          />

          {user.reviewRequestsRecv.length > 0 && (
            <section className="panel">
              <h2>Review requests</h2>
              <ul className="sub-list">
                {user.reviewRequestsRecv.map((r) => (
                  <li key={r.id}>
                    {r.tutorUser.name} asked for a review —{" "}
                    <Link href={`/tutors/${r.tutorProfileId}`}>Leave a review</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel dashboard-section-card">
            <div className="dashboard-section-head">
              <div>
                <h2>Your requests</h2>
                <p className="muted section-lead-tight">
                  Tutors browse open requests — post what you need and get replies.
                </p>
              </div>
              <Link href="/ads/new" className="btn btn-secondary btn-sm">
                + New request
              </Link>
            </div>
            {user.studentAds.length === 0 ? (
              <div className="dashboard-empty-card">
                <p>
                  <strong>No requests yet.</strong> Post what you need and matching tutors can
                  message you.
                </p>
                <Link href="/ads/new" className="btn btn-sm">
                  Post your first request
                </Link>
              </div>
            ) : (
              <div className="student-ad-grid">
                {user.studentAds.map((ad) => (
                  <StudentAdCard
                    key={ad.id}
                    ad={ad}
                    currency={currency}
                    href="/ads"
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
