import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { VerificationForm } from "@/components/VerificationForm";
import { TutorAdsManager } from "@/components/TutorAdsManager";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { TutorPlanPanel } from "@/components/TutorPlanPanel";
import { ProfileBoostPanel } from "@/components/ProfileBoostPanel";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { PointsWalletPanel } from "@/components/PointsWalletPanel";
import { ensureHubPointsFresh, getHubPointsSummary } from "@/lib/hub-points";
import { DashboardMessageAlert } from "@/components/DashboardMessageAlert";
import { getUnreadMessageSummary } from "@/lib/message-inbox";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { getPlan } from "@/lib/plans";
import {
  TutorBadgeProgressPanel,
  TutorRecommendationForm,
} from "@/components/TutorBadgeProgress";
import { TutorTrustBadgePill } from "@/components/TutorTrustBadgePill";
import { getTutorBadgeStats, tutorBadgeProgress } from "@/lib/tutor-badges";
import {
  type DashboardSearchParams,
  prepareDashboardHome,
  resolveTutorDashboardTab,
  roleDashboardPath,
  isTutorDashboardProfileComplete,
} from "@/lib/dashboard-home";
import { TutorDashboardTabs } from "@/components/TutorDashboardTabs";
import { TutorDashboardShortcuts } from "@/components/TutorDashboardShortcuts";
import { TutorProfileStatusCard } from "@/components/TutorProfileStatusCard";
import { PostVerifyTutorChecklist } from "@/components/PostVerifyChecklist";
import { buildTutorProfileStatus } from "@/lib/tutor-profile-status";

export const metadata = { title: "Tutor dashboard" };
export const dynamic = "force-dynamic";

export default async function TutorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams & { live?: string }>;
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
  const profileComplete = user.tutorProfile
    ? isTutorDashboardProfileComplete(user.tutorProfile, user.name)
    : false;
  const activeTab = resolveTutorDashboardTab(sp, profileComplete);
  const statusView = user.tutorProfile
    ? buildTutorProfileStatus({
        profileId: user.tutorProfile.id,
        name: user.name,
        photoUrl: user.tutorProfile.photoUrl,
        headline: user.tutorProfile.headline,
        bio: user.tutorProfile.bio,
        country: user.tutorProfile.country,
        location: user.tutorProfile.location,
        subjects: user.tutorProfile.subjects,
        hourlyRate: user.tutorProfile.hourlyRate,
        online: user.tutorProfile.online,
        inPerson: user.tutorProfile.inPerson,
        qualifications: user.tutorProfile.qualifications,
        emailVerified: user.emailVerified,
        forceActive: user.tutorProfile.forceActive,
        active: user.tutorProfile.active,
        suspended: user.suspended,
      })
    : null;
  const justWentLive = sp.live === "1" && statusView?.status === "LIVE";

  return (
    <div className="page tutor-dashboard-page">
      <div className="container">
        <header className="tutor-dashboard-hero">
          <div>
            <h1 className="page-title">Hi, {user.name}</h1>
            <p className="muted">
              {statusView?.status === "LIVE"
                ? "Your listing is live — grow your badge and reply to student requests."
                : "Complete your profile to appear in search, then reply to student requests."}
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
                  Preview my public profile
                </Link>
              )}
              <Link className="btn btn-sm" href="/messages">
                Messages{inbox.unread > 0 ? ` (${inbox.unread})` : ""}
              </Link>
            </div>
          ) : null}
        </header>

        {statusView ? (
          <TutorProfileStatusCard view={statusView} justWentLive={justWentLive} />
        ) : null}

        {sp.verified === "1" && statusView ? (
          <PostVerifyTutorChecklist view={statusView} />
        ) : null}
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

        <TutorDashboardTabs active={activeTab} sp={sp} profilePct={statusView?.percent} />

        {activeTab === "growth" ? (
          <>
            <section className="panel tutor-student-requests-panel">
              <h2>Students looking for tutors</h2>
              <p className="muted">
                Browse open student requests that match subjects you teach. Messaging limits follow
                your current plan — free accounts can still reply within existing rules.
              </p>
              <Link className="btn btn-secondary" href="/ads">
                View student requests
              </Link>
            </section>

            <div className="tutor-dashboard-overview">
              <PointsWalletPanel summary={hubPoints} role="TUTOR" />

              <TutorPlanPanel
                corePlan={corePlan}
                addOnSubs={addOnSubs}
                pendingSubs={pendingSubs}
                currency={currency}
                paidCheckoutLive={paidCheckoutLive}
              />
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
                  <h2>Edit your public listing</h2>
                  <p className="muted">
                    Complete the short wizard step by step. Optional steps have <strong>Skip for now</strong>.
                    After saving, improve trust with verification and star badges.
                  </p>
                </div>
                <div className="tutor-profile-status-pills">
                  <span
                    className={`tutor-status-pill${user.tutorProfile.active ? " is-live" : ""}`}
                  >
                    {user.tutorProfile.active ? "LIVE" : "INCOMPLETE"}
                  </span>
                  {user.tutorProfile.verified ? (
                    <span className="badge badge-verified">✓ Verified</span>
                  ) : (
                    <span className="badge">Unverified badge</span>
                  )}
                  {badgeProgress ? (
                    <TutorTrustBadgePill badge={badgeProgress.current} size="sm" />
                  ) : null}
                </div>
              </div>

              {!user.tutorProfile.active ? (
                <div className="tutor-profile-hidden-note">
                  Students cannot find this listing in search yet. Finish the required fields above,
                  verify your email, then save — eligible profiles go live automatically.
                </div>
              ) : null}

              {!user.tutorProfile.verified ? (
                <p className="field-hint">
                  Optional: upload your government ID in{" "}
                  <a href="#get-verified">Get verified</a> below for the verified badge. Verification
                  is not required to go live.
                </p>
              ) : null}

              <TutorProfileForm
                initial={user.tutorProfile}
                displayName={user.name}
                subjects={catalogSubjects}
                extraLevels={extraLevels}
                emailVerified={Boolean(user.emailVerified)}
                listingActive={user.tutorProfile.active}
                verified={user.tutorProfile.verified}
                trustBadge={badgeProgress?.current || "NEW"}
                wizard={!user.tutorProfile.active}
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

                {user.tutorProfile.active || user.tutorProfile.verified ? (
                  <section className="panel" id="get-verified">
                    <h2>Get verified</h2>
                    <p className="muted">
                      Upload a government photo ID (passport, national ID / CNIC, or driving licence).
                      Your profile shows <strong>Unverified</strong> until an admin approves your
                      documents. Documents stay private — admins only.
                    </p>
                    <VerificationForm />
                  </section>
                ) : (
                  <p className="muted panel">
                    Verification is included in the profile wizard (optional step). After you go live,
                    you can also manage documents here anytime.
                  </p>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
