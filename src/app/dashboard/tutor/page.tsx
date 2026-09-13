import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { TutorAdsManager } from "@/components/TutorAdsManager";
import { ProfileImprovePanel } from "@/components/ProfileImprovePanel";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { TutorPlanPanel } from "@/components/TutorPlanPanel";
import { ProfileBoostPanel } from "@/components/ProfileBoostPanel";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { PointsWalletPanel } from "@/components/PointsWalletPanel";
import { ensureHubPointsFresh, getHubPointsSummary } from "@/lib/hub-points";
import { DashboardMessageAlert } from "@/components/DashboardMessageAlert";
import { getUnreadMessageSummary } from "@/lib/message-inbox";
import { isPaidCheckoutLive } from "@/lib/payments-status";
import { getLivePlan, getPlan } from "@/lib/plans";
import { TutorBadgeProgressPanel, TutorRecommendationForm } from "@/components/TutorBadgeProgress";
import { getTutorBadgeStats, tutorBadgeProgress } from "@/lib/tutor-badges";
import {
  type DashboardSearchParams,
  prepareDashboardHome,
  resolveTutorDashboardTab,
  roleDashboardPath,
  isTutorDashboardProfileComplete,
  getDbUserRole,
} from "@/lib/dashboard-home";
import { resolveTutorWizardResumeStep } from "@/lib/tutor-wizard";
import { isValidActiveTeachingProfile } from "@/lib/teaching-profile-write";
import { tutorCanonicalDuplicateNotice } from "@/lib/teaching-profile-duplicates";
import { TeachingProfileDuplicateNotice } from "@/components/TeachingProfileDuplicateNotice";
import { TutorDashboardTabs } from "@/components/TutorDashboardTabs";
import { PageConversion } from "@/components/PageConversion";
import { TutorDashboardShortcuts } from "@/components/TutorDashboardShortcuts";
import { TutorProfileStatusCard } from "@/components/TutorProfileStatusCard";
import { PostVerifyTutorChecklist } from "@/components/PostVerifyChecklist";
import { SwitchProfileButton } from "@/components/SwitchProfileButton";
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
  const dbRole = (await getDbUserRole(session.user.id)) || session.user.role;
  if (dbRole === "ADMIN") redirect("/admin");
  if (dbRole === "STUDENT") {
    redirect(roleDashboardPath("STUDENT", await searchParams));
  }

  const sp = await searchParams;
  const paidCheckoutLive = isPaidCheckoutLive();
  const [{ user, currency, catalogSubjects, extraLevels, pendingSubs, corePlan, addOnSubs }, inbox, tutorProPlan] =
    await Promise.all([
      prepareDashboardHome(session.user.id, "TUTOR", sp),
      getUnreadMessageSummary(session.user.id),
      getLivePlan("TUTOR_BASIC"),
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
        subjectProfiles: user.tutorProfile.subjectProfiles,
        emailVerified: user.emailVerified,
        forceActive: user.tutorProfile.forceActive,
        active: user.tutorProfile.active,
        suspended: user.suspended,
      })
    : null;
  const justWentLive = sp.live === "1" && statusView?.status === "LIVE";
  const teachingProfileDuplicate = user.tutorProfile
    ? tutorCanonicalDuplicateNotice(user.tutorProfile.subjectProfiles)
    : null;

  return (
    <div className="page tutor-dashboard-page">
      <div className="container">
        {justWentLive ? (
          <PageConversion
            event="tutor_profile_completed"
            dedupeKey={`tutor_live_${user.id}`}
            params={{}}
          />
        ) : null}
        <header className="panel page-hero tutor-dashboard-hero">
          <div className="page-hero-copy">
            <h1 className="page-title">Hi, {user.name}</h1>
            <p className="muted">
              {statusView?.status === "LIVE"
                ? "Your profile is live — manage Teaching Profiles and reply to students."
                : "Quick setup: photo → about you → location → qualifications → one Teaching Profile."}
            </p>
          </div>
          <div className="page-hero-actions">
            <Link className="btn btn-sm" href="/messages">
              Messages{inbox.unread > 0 ? ` (${inbox.unread})` : ""}
            </Link>
            {profileComplete ? (
              <Link className="btn btn-secondary btn-sm" href="/ads">
                Student requests
              </Link>
            ) : null}
            <SwitchProfileButton
              target="STUDENT"
              label="Student mode"
              className="btn btn-secondary btn-sm"
              busyLabel="Switching…"
            />
          </div>
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

        {profileComplete ? (
          <TutorDashboardTabs active={activeTab} sp={sp} profilePct={statusView?.percent} />
        ) : (
          <nav className="page-tabs tutor-dashboard-tabs" aria-label="Tutor setup">
            <span className="page-tab is-active" aria-current="page">
              Quick setup
            </span>
          </nav>
        )}

        {profileComplete && activeTab === "growth" ? (
          <>
            <section className="panel tutor-student-requests-panel">
              <h2>Students looking for tutors</h2>
              <p className="muted">
                Browse open requests that match subjects you teach.
              </p>
              <div className="panel-actions-row">
                <Link className="btn btn-secondary" href="/ads">
                  View student requests
                </Link>
              </div>
            </section>

            <div className="tutor-dashboard-overview">
              <PointsWalletPanel summary={hubPoints} role="TUTOR" />

              <TutorPlanPanel
                corePlan={corePlan}
                addOnSubs={addOnSubs}
                pendingSubs={pendingSubs}
                currency={currency}
                paidCheckoutLive={paidCheckoutLive}
                tutorProPlan={tutorProPlan}
              />
            </div>

            <TutorDashboardShortcuts unread={inbox.unread} sp={sp} />

            <details className="panel tutor-dashboard-more">
              <summary>
                <strong>More tools</strong>
                <span className="muted"> — badges, invite, boost, recommendations</span>
              </summary>
              <div className="tutor-dashboard-stack" style={{ marginTop: "0.85rem" }}>
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

                {user.tutorProfile ? <ProfileBoostPanel currency={currency} /> : null}

                {user.tutorProfile ? (
                  <section className="panel" id="add-listing-cta">
                    <h2>Reach more students</h2>
                    <TeachingProfileDuplicateNotice message={teachingProfileDuplicate?.message} />
                    <p className="muted">
                      Add a Teaching Profile for each subject — students search by subject, level, and board.
                    </p>
                    <Link className="btn btn-sm" href="/dashboard/tutor?tab=profile#teaching-listings">
                      Manage Teaching Profiles
                    </Link>
                  </section>
                ) : null}

                {user.tutorProfile && badgeProgress ? (
                  <div id="tutor-recommendations">
                    <TutorRecommendationForm />
                  </div>
                ) : null}
              </div>
            </details>
          </>
        ) : (
          <div className="tutor-dashboard-stack">
            {user.tutorProfile ? (
              <section className="panel tutor-profile-workspace" id="tutor-profile">
              <div className="tutor-profile-workspace-head">
                <div>
                  <h2>{profileComplete ? "My profile" : "Set up your tutor profile"}</h2>
                  <p className="muted">
                    {profileComplete
                      ? "Photo, bio, and extras — Teaching Profiles for each subject are below."
                      : "Finish the steps below, then add a Teaching Profile to go live."}
                  </p>
                </div>
                <div className="tutor-profile-status-pills">
                  <span
                    className={`tutor-status-pill${user.tutorProfile.active ? " is-live" : ""}`}
                  >
                    {user.tutorProfile.active ? "Live" : "Setup"}
                  </span>
                  {user.tutorProfile.verified ? (
                    <span className="badge badge-verified">Verified</span>
                  ) : null}
                </div>
              </div>

              <TutorProfileForm
                initial={user.tutorProfile}
                displayName={user.name}
                subjects={catalogSubjects}
                extraLevels={extraLevels}
                emailVerified={Boolean(user.emailVerified)}
                listingActive={user.tutorProfile.active}
                verified={user.tutorProfile.verified}
                currency={currency}
                startStep={
                  sp.verify === "1" && !user.tutorProfile.verified
                    ? "verify"
                    : resolveTutorWizardResumeStep(
                        {
                          ...user.tutorProfile,
                          name: user.name,
                          subjectProfiles: user.tutorProfile.subjectProfiles,
                        },
                        {
                          verified: user.tutorProfile.verified,
                          live: user.tutorProfile.active,
                        },
                      )
                }
                hasValidTeachingProfile={user.tutorProfile.subjectProfiles.some(isValidActiveTeachingProfile)}
                hasAnyTeachingProfile={user.tutorProfile.subjectProfiles.length > 0}
              />

              <div className="tutor-workspace-subjects" id="teaching-listings">
                <header className="teaching-listings-head">
                  <div>
                    <h2 id="teaching-listings-section">Teaching Profiles</h2>
                    <p className="muted">One subject per profile — students find you by subject and rate.</p>
                  </div>
                </header>
                <TutorAdsManager
                  subjects={catalogSubjects}
                  extraLevels={extraLevels}
                  currency={currency}
                  paidCheckoutLive={paidCheckoutLive}
                />
              </div>

              {user.tutorProfile.active ? (
                <ProfileImprovePanel
                  listingLive={user.tutorProfile.active}
                  verified={user.tutorProfile.verified}
                  trustBadge={badgeProgress?.current || "NEW"}
                />
              ) : null}
            </section>
          ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
