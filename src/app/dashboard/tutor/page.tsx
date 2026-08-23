import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { VerificationForm } from "@/components/VerificationForm";
import { TutorAdsManager } from "@/components/TutorAdsManager";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";
import { ProfileBoostPanel } from "@/components/ProfileBoostPanel";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { PointsWalletPanel } from "@/components/PointsWalletPanel";
import { ensureHubPointsFresh, getHubPointsSummary } from "@/lib/hub-points";
import { DashboardMessageAlert } from "@/components/DashboardMessageAlert";
import { getUnreadMessageSummary } from "@/lib/message-inbox";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { getPlan } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import {
  TutorBadgeProgressPanel,
  TutorRecommendationForm,
} from "@/components/TutorBadgeProgress";
import { TutorTrustBadgePill } from "@/components/TutorTrustBadgePill";
import { getTutorBadgeStats, tutorBadgeProgress } from "@/lib/tutor-badges";
import {
  type DashboardSearchParams,
  prepareDashboardHome,
  profileStrength,
  resolveTutorDashboardTab,
  roleDashboardPath,
  isTutorDashboardProfileComplete,
} from "@/lib/dashboard-home";
import { TutorDashboardTabs } from "@/components/TutorDashboardTabs";
import { TutorDashboardShortcuts } from "@/components/TutorDashboardShortcuts";

export const metadata = { title: "Tutor dashboard" };
export const dynamic = "force-dynamic";

export default async function TutorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard/tutor");
  if (session.user.role === "ADMIN") redirect("/admin");
  if (session.user.role === "STUDENT") {
    redirect(roleDashboardPath("STUDENT", await searchParams));
  }

  const sp = await searchParams;
  const paidCheckoutLive = isPaidCheckoutLive();
  const [{ user, currency, catalogSubjects, extraLevels, pendingSubs, corePlan, addOnSubs }, inbox] =
    await Promise.all([
      prepareDashboardHome(session.user.id, "TUTOR", sp),
      getUnreadMessageSummary(session.user.id),
    ]);
  await ensureHubPointsFresh(session.user.id);
  const hubPoints = await getHubPointsSummary(session.user.id, { currency, role: "TUTOR" });
  const badgeProgress = user.tutorProfile
    ? tutorBadgeProgress(await getTutorBadgeStats(user.tutorProfile.id))
    : null;
  const profileStats = user.tutorProfile
    ? profileStrength(user.tutorProfile, user.name)
    : null;
  const profileComplete = user.tutorProfile
    ? isTutorDashboardProfileComplete(user.tutorProfile, user.name)
    : false;
  const activeTab = resolveTutorDashboardTab(sp, profileComplete);

  return (
    <div className="page tutor-dashboard-page">
      <div className="container">
        <header className="tutor-dashboard-hero">
          <div>
            <h1 className="page-title">Hi, {user.name}</h1>
            <p className="muted">
              Complete your profile to appear in search, grow your badge, and reply to student
              requests.
            </p>
          </div>
          {user.tutorProfile ? (
            <div className="tutor-dashboard-hero-actions">
              {user.tutorProfile.active ? (
                <Link className="btn btn-secondary btn-sm" href={`/tutors/${user.tutorProfile.id}`}>
                  View public profile
                </Link>
              ) : (
                <Link className="btn btn-secondary btn-sm" href={`/tutors/${user.tutorProfile.id}`}>
                  Preview profile
                </Link>
              )}
              <Link className="btn btn-sm" href="/messages">
                Messages{inbox.unread > 0 ? ` (${inbox.unread})` : ""}
              </Link>
            </div>
          ) : null}
        </header>

        {sp.verified === "1" && (
          <p className="success panel tutor-dashboard-alert">
            Email verified. Messaging and ads unlock with your plan.
          </p>
        )}
        {!user.emailVerified && (
          <div className="panel tutor-dashboard-alert tutor-dashboard-alert--verify">
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
          <p className="success panel tutor-dashboard-alert">
            Payment confirmed. Your plan is active
            {sp.plan ? ` (${getPlan(sp.plan as never)?.name || sp.plan})` : ""}.
          </p>
        )}

        <TutorDashboardTabs active={activeTab} sp={sp} profilePct={profileStats?.pct} />

        {activeTab === "growth" ? (
          <>
            <div className="tutor-dashboard-overview">
              <PointsWalletPanel summary={hubPoints} role="TUTOR" />

              <section className="panel tutor-dashboard-card">
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
                    {addOnSubs
                      .filter((s) => s.id !== corePlan.id)
                      .map((s) => (
                        <li key={s.id}>
                          <strong>{getPlan(s.plan as never)?.name || s.plan}</strong>
                          {s.currentPeriodEnd
                            ? ` · until ${s.currentPeriodEnd.toLocaleDateString()}`
                            : ""}{" "}
                          · <Link href={`/receipt/${s.id}`}>View slip</Link>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="muted">
                    Complete your profile to appear in search for free. Tutor Basic unlocks priority
                    ranking, unlimited enquiry reveals, and subject ads.
                  </p>
                )}
                {pendingSubs.length > 0 && (
                  <div className="tutor-dashboard-pending">
                    <p className="muted">
                      {pendingSubs.length} unfinished checkout
                      {pendingSubs.length === 1 ? "" : "s"}. If Safepay already charged you, confirm
                      below.
                    </p>
                    <div className="tutor-dashboard-pending-actions">
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
                  <div className="plan-cta">
                    <SubscribeButton
                      plan="TUTOR_BASIC"
                      planLabel="Tutor Basic"
                      currency={currency}
                      label="Activate Tutor Basic free"
                      complimentary
                      paidCheckoutLive={paidCheckoutLive}
                    />
                  </div>
                )}
                <p className="tutor-dashboard-card-foot">
                  <Link href="/dashboard/tutor/plan">Plan details</Link>
                  {" · "}
                  <Link href="/pricing">Tutor add-ons</Link>
                </p>
                {!corePlan && <RecoverPaymentForm />}
              </section>
            </div>

            <TutorDashboardShortcuts unread={inbox.unread} sp={sp} />

            <div className="tutor-dashboard-stack">
            {badgeProgress ? (
              <div className="tutor-dashboard-timeline">
                <TutorBadgeProgressPanel progress={badgeProgress} layout="horizontal" />
              </div>
            ) : null}

            <InviteTutorShare
              referrerId={session.user.id}
              referrerName={session.user.name}
              compact
              id="invite-tutor"
            />

            {user.tutorProfile ? (
              <ProfileBoostPanel boostUntil={user.tutorProfile.boostUntil} currency={currency} />
            ) : null}

            {user.tutorProfile && badgeProgress ? (
              <div id="tutor-recommendations">
                <TutorRecommendationForm />
              </div>
            ) : null}
            </div>
          </>
        ) : (
          <div className="tutor-dashboard-stack">
            {user.tutorProfile ? (
              <section className="panel tutor-profile-workspace" id="tutor-profile">
              <div className="tutor-profile-workspace-head">
                <div>
                  <h2>Your tutor profile</h2>
                  <p className="muted">
                    This is your public listing. Students find you here — complete every field marked
                    with * to go live in search.
                  </p>
                </div>
                <div className="tutor-profile-status-pills">
                  <span
                    className={`tutor-status-pill${user.tutorProfile.active ? " is-live" : ""}`}
                  >
                    {user.tutorProfile.active ? "Live in search" : "Draft — not visible"}
                  </span>
                  {user.tutorProfile.verified ? (
                    <span className="badge badge-verified">✓ Verified</span>
                  ) : (
                    <span className="badge">Unverified</span>
                  )}
                  {badgeProgress ? (
                    <TutorTrustBadgePill badge={badgeProgress.current} size="sm" />
                  ) : null}
                </div>
              </div>

              {profileStats ? (
                <div className="profile-strength tutor-profile-strength-banner">
                  <div className="profile-strength-label">
                    <span>Profile completion</span>
                    <span>{profileStats.pct}%</span>
                  </div>
                  <div className="profile-strength-bar">
                    <div
                      className="profile-strength-fill"
                      style={{ width: `${profileStats.pct}%` }}
                    />
                  </div>
                  {profileStats.missing.length > 0 ? (
                    <p className="profile-strength-nudge">
                      Still needed: <strong>{profileStats.missing.join(", ")}</strong>
                    </p>
                  ) : (
                    <p className="success" style={{ margin: "0.5rem 0 0" }}>
                      All required fields complete — your profile can appear in search.
                    </p>
                  )}
                </div>
              ) : null}

              {!user.tutorProfile.active ? (
                <div className="tutor-profile-hidden-note">
                  Students cannot see this listing yet. Save your profile with all required fields
                  to appear in search for free.
                </div>
              ) : null}

              {!user.tutorProfile.verified ? (
                <p className="field-hint">
                  Upload your government ID in{" "}
                  <a href="#get-verified">Get verified</a> below for the verified badge.
                </p>
              ) : null}

              <TutorProfileForm
                initial={user.tutorProfile}
                displayName={user.name}
                subjects={catalogSubjects}
                extraLevels={extraLevels}
              />
            </section>
          ) : null}

            {user.tutorProfile ? (
              <>
                <section className="panel">
                  <h2>Optional subject ads</h2>
                  <p className="muted">
                    Extra subject-specific ads on top of your profile. Not required to get found.
                  </p>
                  <TutorAdsManager subjects={catalogSubjects} extraLevels={extraLevels} />
                </section>

                <section className="panel" id="get-verified">
                  <h2>Get verified</h2>
                  <p className="muted">
                    Upload a government photo ID (passport, national ID / CNIC, or driving licence).
                    Your profile shows <strong>Unverified</strong> until an admin approves your
                    documents. Documents stay private — admins only.
                  </p>
                  <VerificationForm />
                </section>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
