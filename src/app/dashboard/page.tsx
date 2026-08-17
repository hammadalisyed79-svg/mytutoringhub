import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { VerificationForm } from "@/components/VerificationForm";
import { TutorAdsManager } from "@/components/TutorAdsManager";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";
import { getPlan } from "@/lib/plans";
import { syncTutorBadges } from "@/lib/subscription";
import { reconcileUserSafepayPayments } from "@/lib/safepay-complete";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string;
    subscribed?: string;
    plan?: string;
    state?: string;
    verify?: string;
    verified?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");
  const sp = await searchParams;

  const justActivated = await reconcileUserSafepayPayments(session.user.id);
  if (session.user.role === "TUTOR") {
    await syncTutorBadges(session.user.id);
  }
  if (justActivated[0] && !sp.checkout) {
    redirect(`/receipt/${justActivated[0]}`);
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" } },
      tutorProfile: true,
      studentAds: { orderBy: { createdAt: "desc" }, take: 5 },
      reviewRequestsRecv: {
        where: { status: "PENDING" },
        include: { tutorUser: { select: { name: true } } },
        take: 10,
      },
    },
  });

  const visibleSubs = user.subscriptions.filter((s) =>
    ["ACTIVE", "TRIALING"].includes(s.status),
  );
  const pendingSubs = user.subscriptions.filter((s) => s.status === "INCOMPLETE");

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Hi, {user.name}</h1>
        <p className="muted">
          Role: {user.role.toLowerCase()} · Manage your profile, subscriptions, and activity.
        </p>
        {sp.verified === "1" && (
          <p className="success panel" style={{ marginTop: "1rem" }}>
            Email verified. You can now message, post ads, and use the study assistant.
          </p>
        )}
        {user.role !== "ADMIN" && !user.emailVerified && (
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
          <section className="panel">
            <h2>Subscriptions</h2>
            {visibleSubs.length === 0 && (
              <p className="muted">No active plans yet. Subscribe to unlock messaging.</p>
            )}
            <ul className="sub-list">
              {visibleSubs.map((s) => (
                <li key={s.id}>
                  <strong>{getPlan(s.plan as never)?.name || s.plan}</strong> — {s.status}
                  {s.currentPeriodEnd
                    ? ` · until ${s.currentPeriodEnd.toLocaleDateString()}`
                    : ""}{" "}
                  · <Link href={`/receipt/${s.id}`}>View slip</Link>
                </li>
              ))}
            </ul>
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
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <Link href="/pricing" className="btn btn-sm">
                View plans
              </Link>
              <Link href="/settings" className="btn btn-secondary btn-sm">
                Settings
              </Link>
            </div>
            {visibleSubs.length === 0 && <RecoverPaymentForm />}
          </section>

          <section className="panel">
            <h2>Quick links</h2>
            <div className="dash-links">
              <Link href="/search">Browse tutors</Link>
              <Link href="/ads">Student ads</Link>
              <Link href="/messages">Messages</Link>
              <Link href="/settings">Account settings</Link>
              <Link href="/help">Help</Link>
              {user.role === "ADMIN" && <Link href="/admin">Admin panel</Link>}
            </div>
          </section>

          {user.role === "STUDENT" && user.reviewRequestsRecv.length > 0 && (
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

          {user.role === "TUTOR" && user.tutorProfile && (
            <>
              <section className="panel" style={{ gridColumn: "1 / -1" }}>
                <h2>Your tutor profile</h2>
                <p className="muted">
                  Status: {user.tutorProfile.active ? "Listed" : "Hidden until Tutor Basic is active"}{" "}
                  · {user.tutorProfile.verified ? "Verified" : "Not verified"} ·{" "}
                  {user.tutorProfile.highlighted ||
                  (user.tutorProfile.highlightedUntil &&
                    user.tutorProfile.highlightedUntil > new Date())
                    ? "Highlighted"
                    : "Standard listing"}
                </p>
                {!user.tutorProfile.active && (
                  <p className="panel" style={{ borderColor: "var(--brand)", background: "rgba(15, 90, 70, 0.06)", marginBottom: "1rem" }}>
                    Students cannot see this listing yet.{" "}
                    <Link href="/pricing">Activate Tutor Basic</Link> to appear in search, then share your
                    public profile link.
                  </p>
                )}
                <TutorProfileForm initial={user.tutorProfile} />
                <p style={{ marginTop: "1rem" }}>
                  {user.tutorProfile.active ? (
                    <Link href={`/tutors/${user.tutorProfile.id}`}>View public profile</Link>
                  ) : (
                    <>
                      <Link href={`/tutors/${user.tutorProfile.id}`}>Preview your profile</Link>
                      <span className="muted"> (only you can see it until Tutor Basic is active)</span>
                    </>
                  )}
                </p>
              </section>
              <section className="panel" style={{ gridColumn: "1 / -1" }}>
                <h2>Subject ads</h2>
                <TutorAdsManager />
              </section>
              <section className="panel" style={{ gridColumn: "1 / -1" }}>
                <h2>Get verified</h2>
                <p className="muted">
                  Submit ID or certificate links for admin review. Purchasing Verified Tutor also
                  prioritises your request.
                </p>
                <VerificationForm />
              </section>
            </>
          )}

          {user.role === "STUDENT" && (
            <section className="panel" style={{ gridColumn: "1 / -1" }}>
              <h2>Your ads</h2>
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
          )}
        </div>
      </div>
    </div>
  );
}
