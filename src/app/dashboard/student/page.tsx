import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";
import { getPlan } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import { PointsWalletPanel } from "@/components/PointsWalletPanel";
import { StudentAdCard } from "@/components/StudentAdCard";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { ensureHubPointsFresh, getHubPointsSummary } from "@/lib/hub-points";
import { DashboardMessageAlert } from "@/components/DashboardMessageAlert";
import { getUnreadMessageSummary } from "@/lib/message-inbox";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { STUDENT_FREE_CONTACTS_LINE } from "@/lib/marketing-copy";
import {
  type DashboardSearchParams,
  prepareDashboardHome,
  roleDashboardPath,
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
  if (session.user.role === "ADMIN") redirect("/admin");
  if (session.user.role === "TUTOR") {
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

  return (
    <div className="page student-dashboard-page">
      <div className="container">
        <header className="student-dashboard-hero">
          <div>
            <h1 className="page-title">Hi, {user.name}</h1>
            <p className="muted">
              Find a tutor, use free monthly contacts or a Student Pass, or post a request.
            </p>
          </div>
          <div className="student-dashboard-hero-actions">
            <Link href="/search" className="btn btn-sm">
              Search tutors
            </Link>
            <Link href="/messages" className="btn btn-secondary btn-sm">
              Messages{inbox.unread > 0 ? ` (${inbox.unread})` : ""}
            </Link>
          </div>
        </header>

        {sp.verified === "1" && (
          <p className="success panel student-dashboard-alert">
            Email verified. Messaging and ads unlock with your plan; the AI study assistant needs
            Student Pro.
          </p>
        )}
        {!user.emailVerified && (
          <div className="panel student-dashboard-alert student-dashboard-alert--verify">
            <p style={{ marginTop: 0 }}>
              Please verify {user.email}. Mail is sent from admin@mytutoringhub.com. Check inbox,
              junk, and promotions.
            </p>
            <ResendVerificationButton email={user.email} />
          </div>
        )}
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

          <section className="panel student-dashboard-card">
            <h2>Your plan</h2>
            {corePlan ? (
              <ul className="sub-list">
                <li>
                  <strong>{getPlan(corePlan.plan as never)?.name || corePlan.plan}</strong>
                  {corePlan.currentPeriodEnd
                    ? ` · until ${corePlan.currentPeriodEnd.toLocaleDateString()}`
                    : " · active"}{" "}
                  · <Link href={`/receipt/${corePlan.id}`}>View slip</Link>
                </li>
              </ul>
            ) : (
              <p className="muted">
                {STUDENT_FREE_CONTACTS_LINE} Student Pro adds unlimited past papers and AI.
              </p>
            )}
            {pendingSubs.length > 0 && (
              <div className="student-dashboard-pending">
                <p className="muted">
                  {pendingSubs.length} unfinished checkout
                  {pendingSubs.length === 1 ? "" : "s"}. If Safepay already charged you, open
                  Dashboard again to confirm, or tap confirm below.
                </p>
                <div className="student-dashboard-pending-actions">
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
            )}
            {!corePlan && (
              <div className="plan-cta" style={{ marginTop: "0.85rem" }}>
                <SubscribeButton
                  plan="STUDENT_PASS"
                  planLabel="Student Pass"
                  currency={currency}
                  label="Pay with Safepay · Student Pass"
                  featured
                  paidCheckoutLive={paidCheckoutLive}
                />
              </div>
            )}
            <p className="student-dashboard-card-foot">
              <Link href="/dashboard/student/plan">Your plan details</Link>
              {" · "}
              <Link href="/pricing">See Student Pass →</Link>
            </p>
            {!corePlan && <RecoverPaymentForm />}
          </section>

          <section className="panel student-dashboard-card student-dashboard-shortcuts">
            <h2>Shortcuts</h2>
            <div className="dash-links dash-links-grid">
              <Link href="/messages">
                Messages
                {inbox.unread > 0 ? ` (${inbox.unread} unread)` : ""}
              </Link>
              <Link href="/ads">Student requests</Link>
              <Link href="/ads/new">Post a request</Link>
              <Link href="/past-papers">Past papers</Link>
              <Link href="/study/countdown">Exam countdown</Link>
              <Link href="/study/progress">Study progress</Link>
              <Link href="/assistant">Study assistant</Link>
              <Link href="/dashboard/student/plan">Your plan</Link>
              <Link href="/settings">Account settings</Link>
              <Link href="/become-a-tutor">Become a tutor</Link>
            </div>
          </section>
        </div>

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
