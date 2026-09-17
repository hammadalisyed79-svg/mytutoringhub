import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TutorProfileWorkspace } from "@/components/TutorProfileWorkspace";
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
  tutorDashboardTabHref,
} from "@/lib/dashboard-home";
import { resolveTutorWizardResumeStep } from "@/lib/tutor-wizard";
import { isValidActiveTeachingProfile } from "@/lib/teaching-profile-write";
import { tutorCanonicalDuplicateNotice } from "@/lib/teaching-profile-duplicates";
import { TeachingProfileDuplicateNotice } from "@/components/TeachingProfileDuplicateNotice";
import { TutorDashboardTabs } from "@/components/TutorDashboardTabs";
import { PageConversion } from "@/components/PageConversion";
import { TutorDashboardShortcuts } from "@/components/TutorDashboardShortcuts";
import { TutorGrowthNextSteps } from "@/components/TutorGrowthNextSteps";
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
            <p className="eyebrow">Tutor dashboard</p>
            <h1 className="page-title">Hi, {user.name}</h1>
            <p className="muted tutor-dashboard-lead">
              {statusView?.status === "LIVE"
                ? "Your listing is live. Grow with subjects, messages, and requests."
                : "Build a polished profile, publish a subject, then go live in search."}
            </p>
          </div>
          <div className="page-hero-actions">
            {user.tutorProfile ? (
              <Link
                className="btn"
                href={`/tutors/${user.tutorProfile.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                See how students see you
              </Link>
            ) : null}
            <Link className="btn btn-secondary" href="/messages">
              Messages{inbox.unread > 0 ? ` (${inbox.unread})` : ""}
            </Link>
            {profileComplete ? (
              <Link className="btn btn-secondary" href="/ads">
                Requests
              </Link>
            ) : null}
            <SwitchProfileButton
              target="STUDENT"
              label="Student mode"
              className="btn btn-secondary"
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
            <TutorGrowthNextSteps
              liveInSearch={statusView?.status === "LIVE"}
              unread={inbox.unread}
              sp={sp}
            />

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

            <TutorDashboardShortcuts
              unread={inbox.unread}
              sp={sp}
              profileHref={user.tutorProfile ? `/tutors/${user.tutorProfile.id}` : null}
            />

            <details className="panel tutor-dashboard-more">
              <summary>
                <strong>More tools</strong>
                <span className="muted"> — plan, boost, badges, invite, settings</span>
              </summary>
              <div className="tutor-dashboard-stack" style={{ marginTop: "0.85rem" }}>
                <div className="panel-actions-row" style={{ marginBottom: "0.75rem" }}>
                  <Link className="btn btn-secondary btn-sm" href="/dashboard/tutor/plan">
                    Your plan
                  </Link>
                  <Link className="btn btn-secondary btn-sm" href="/pricing?plan=AD_BOOST">
                    Listing Boost
                  </Link>
                  <Link className="btn btn-secondary btn-sm" href="/settings">
                    Settings
                  </Link>
                  <Link
                    className="btn btn-secondary btn-sm"
                    href={tutorDashboardTabHref(sp, "profile")}
                  >
                    Edit profile
                  </Link>
                </div>
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
              <TutorProfileWorkspace
                profileId={user.tutorProfile.id}
                initial={{
                  ...user.tutorProfile,
                  name: user.name,
                }}
                displayName={user.name}
                subjects={catalogSubjects}
                extraLevels={extraLevels}
                emailVerified={Boolean(user.emailVerified)}
                trustBadge={badgeProgress?.current || "NEW"}
                currency={currency}
                paidCheckoutLive={paidCheckoutLive}
                hubPointsBalance={hubPoints.balance}
                verifyRequested={sp.verify === "1" && !user.tutorProfile.verified}
                setupComplete={
                  resolveTutorWizardResumeStep({
                    ...user.tutorProfile,
                    name: user.name,
                    subjectProfiles: user.tutorProfile.subjectProfiles,
                  }) === "finish"
                }
                hasValidTeachingProfile={user.tutorProfile.subjectProfiles.some(
                  isValidActiveTeachingProfile,
                )}
                hasAnyTeachingProfile={user.tutorProfile.subjectProfiles.length > 0}
                profileComplete={profileComplete}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
