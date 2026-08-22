import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";
import { getPlan } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import { ReferralShareButton } from "@/components/ReferralShareButton";
import { InviteTutorShare } from "@/components/InviteTutorShare";
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
  const { user, currency, pendingSubs, corePlan } = await prepareDashboardHome(
    session.user.id,
    "STUDENT",
    sp,
  );

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Hi, {user.name}</h1>
        <p className="muted">
          Find a tutor, use free monthly contacts or a Student Pass, or post a request.
        </p>

        {sp.verified === "1" && (
          <p className="success panel" style={{ marginTop: "1rem" }}>
            Email verified. Messaging and ads unlock with your plan; the AI study assistant needs
            Student Pro.
          </p>
        )}
        {!user.emailVerified && (
          <div
            className="panel"
            style={{
              marginTop: "1rem",
              borderColor: "var(--brand)",
              background: "rgba(15, 90, 70, 0.06)",
            }}
          >
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
        {sp.subscribed === "1" && sp.checkout !== "success" && (
          <p className="success panel" style={{ marginTop: "1rem" }}>
            Payment confirmed. Your plan is active
            {sp.plan ? ` (${getPlan(sp.plan as never)?.name || sp.plan})` : ""}.
          </p>
        )}

        <div className="dashboard-grid" style={{ marginTop: "1.5rem" }}>
          <section className="panel" style={{ gridColumn: "1 / -1" }}>
            <h2>Find a tutor</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Search by subject, level, and location — then message tutors that fit.
            </p>
            <div className="hero-ctas" style={{ marginTop: "0.75rem" }}>
              <Link href="/search" className="btn">
                Search tutors
              </Link>
              <Link href="/ads/new" className="btn btn-secondary">
                Post a request
              </Link>
            </div>
          </section>

          <section className="panel">
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
              <div style={{ marginTop: "0.75rem" }}>
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  {pendingSubs.length} unfinished checkout
                  {pendingSubs.length === 1 ? "" : "s"}. If Safepay already charged you, open
                  Dashboard again to confirm, or tap confirm below.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {pendingSubs
                    .filter((s) => s.stripeSubscriptionId?.startsWith("track_"))
                    .map((s) => (
                      <a
                        key={s.id}
                        className="btn btn-secondary btn-sm"
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
                  currency={currency}
                  label="Pay with Safepay · Student Pass"
                  featured
                />
              </div>
            )}
            <p style={{ marginTop: "0.85rem", marginBottom: 0 }}>
              <Link href="/dashboard/student/plan">Your plan details</Link>
              {" · "}
              <Link href="/pricing">See Student Pass →</Link>
            </p>
            {!corePlan && <RecoverPaymentForm />}
            <ReferralShareButton userId={session.user.id} />
            <InviteTutorShare
              referrerId={session.user.id}
              referrerName={session.user.name}
              compact
            />
          </section>

          <section className="panel">
            <h2>Shortcuts</h2>
            <div className="dash-links">
              <Link href="/messages">Messages</Link>
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

          {user.reviewRequestsRecv.length > 0 && (
            <section className="panel" style={{ gridColumn: "1 / -1" }}>
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

          <section className="panel" style={{ gridColumn: "1 / -1" }}>
            <h2>Your requests</h2>
            {user.studentAds.length === 0 && (
              <p className="muted">You have not posted any requests.</p>
            )}
            <div className="results">
              {user.studentAds.map((ad) => (
                <div key={ad.id} className="ad-row">
                  <strong>
                    {ad.title} ({ad.status})
                  </strong>
                  <span className="muted">{ad.subject}</span>
                </div>
              ))}
            </div>
            <Link href="/ads/new" className="btn btn-sm" style={{ marginTop: "0.75rem" }}>
              Post a request
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
