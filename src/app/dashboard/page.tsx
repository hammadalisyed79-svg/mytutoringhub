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
import { SubscribeButton } from "@/components/SubscribeButton";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { uniqueVisibleSubscriptions, syncTutorBadges } from "@/lib/subscription";
import {
  reconcileUserSafepayPaperPurchases,
  reconcileUserSafepayPayments,
} from "@/lib/safepay-complete";
import { curriculumLevels } from "@/lib/curriculum";
import { catalogSubjectNames, mergeSubjectNames } from "@/lib/subject-catalog";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function profileStrength(tp: {
  photoUrl: string | null;
  bio: string | null;
  subjects: string | null;
  qualifications: string | null;
  hourlyRate: number;
  availability: string | null;
}) {
  const missing = [
    !tp.photoUrl && "photo",
    !tp.bio?.trim() && "bio",
    !tp.subjects?.trim() && "subjects",
    !tp.qualifications?.trim() && "qualifications",
    !(tp.hourlyRate > 0) && "hourly rate",
    !tp.availability?.trim() && "availability",
  ].filter(Boolean) as string[];
  const total = 6;
  const done = total - missing.length;
  return { pct: Math.round((done / total) * 100), missing };
}

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

  const [justActivated, currency] = await Promise.all([
    reconcileUserSafepayPayments(session.user.id),
    getVisitorCurrency(),
    reconcileUserSafepayPaperPurchases(session.user.id),
  ]);
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
  const dbSubjects = (await prisma.subject.findMany({ orderBy: { name: "asc" }, select: { name: true } })).map(
    (row) => row.name,
  );
  const catalogSubjects = mergeSubjectNames(dbSubjects, catalogSubjectNames());

  const visibleSubs = uniqueVisibleSubscriptions(user.subscriptions);
  const pendingSubs = user.subscriptions.filter((s) => s.status === "INCOMPLETE");
  const isTutor = user.role === "TUTOR";
  const corePlan = isTutor
    ? visibleSubs.find((s) => s.plan === "TUTOR_BASIC" || s.plan === "VERIFIED_TUTOR")
    : visibleSubs.find((s) => s.plan === "STUDENT_PASS");
  const addOnSubs = isTutor
    ? visibleSubs.filter((s) => s.plan !== "TUTOR_BASIC")
    : [];

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Hi, {user.name}</h1>
        <p className="muted">
          {isTutor
            ? "Complete your profile to appear in search, then reply to student requests."
            : "Find a tutor, message with a Student Pass, or post a request."}
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
                      {s.currentPeriodEnd ? ` · until ${s.currentPeriodEnd.toLocaleDateString()}` : ""}{" "}
                      · <Link href={`/receipt/${s.id}`}>View slip</Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="muted">
                {isTutor
                  ? "Activate Tutor Basic to appear in search. Add-ons stay optional."
                  : "A Student Pass unlocks messaging and tutor requests. Pay on Safepay in one step."}
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
                {isTutor ? (
                  <SubscribeButton
                    plan="TUTOR_BASIC"
                    currency={currency}
                    label="Activate Tutor Basic free"
                    complimentary
                  />
                ) : (
                  <SubscribeButton
                    plan="STUDENT_PASS"
                    currency={currency}
                    label="Pay with Safepay · Student Pass"
                    featured
                  />
                )}
              </div>
            )}
            <p style={{ marginTop: "0.85rem", marginBottom: 0 }}>
              <Link href="/pricing">{isTutor ? "Tutor add-ons" : "See Student Pass"} →</Link>
            </p>
            {!corePlan && <RecoverPaymentForm />}
          </section>

          <section className="panel">
            <h2>{isTutor ? "Tutor tasks" : "Student tasks"}</h2>
            <div className="dash-links">
              {isTutor ? (
                <>
                  <Link href="/student-requests">Student requests</Link>
                  <Link href="/ads">Student ads</Link>
                  <Link href="/messages">Messages</Link>
                  <Link href="/past-papers">Past papers</Link>
                  <Link href="/dashboard/tutor/analytics">Analytics</Link>
                  <Link href="/settings">Account settings</Link>
                </>
              ) : (
                <>
                  <Link href="/search">Find a tutor</Link>
                  <Link href="/student-requests">Student requests</Link>
                  <Link href="/ads/new">Post a request</Link>
                  <Link href="/past-papers">Past papers</Link>
                  <Link href="/messages">Messages</Link>
                  <Link href="/assistant">Study assistant</Link>
                  <Link href="/settings">Account settings</Link>
                  <Link href="/become-a-tutor">Become a tutor</Link>
                </>
              )}
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

          {isTutor && user.tutorProfile && (
            <>
              <section className="panel" style={{ gridColumn: "1 / -1" }}>
                <h2>Your tutor profile</h2>
                <p className="muted">
                  Status: {user.tutorProfile.active ? "Listed" : "Hidden until Tutor Basic is active"}{" "}
                  · {user.tutorProfile.verified ? "✓ Verified" : "Not verified"} ·{" "}
                  {user.tutorProfile.highlighted ||
                  (user.tutorProfile.highlightedUntil &&
                    user.tutorProfile.highlightedUntil > new Date())
                    ? "Highlighted"
                    : "Standard listing"}
                </p>
                {(() => {
                  const { pct, missing } = profileStrength(user.tutorProfile);
                  return (
                    <div className="profile-strength">
                      <div className="profile-strength-label">
                        <span>Profile strength</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="profile-strength-bar">
                        <div className="profile-strength-fill" style={{ width: `${pct}%` }} />
                      </div>
                      {missing.length > 0 && (
                        <p className="profile-strength-nudge">
                          Complete your profile to appear higher in search — add {missing.join(", ")}.
                        </p>
                      )}
                    </div>
                  );
                })()}
                <p className="muted">
                  This is your public listing. Students find you from this profile — there is no
                  separate create-listing step.
                </p>
                {!user.tutorProfile.active && (
                  <p
                    className="panel"
                    style={{
                      borderColor: "var(--brand)",
                      background: "rgba(15, 90, 70, 0.06)",
                      marginBottom: "1rem",
                    }}
                  >
                    Students cannot see this listing yet. Activate Tutor Basic above, then share your
                    public profile link.
                  </p>
                )}
                <TutorProfileForm
                  initial={user.tutorProfile}
                  displayName={user.name}
                  subjects={catalogSubjects}
                  extraLevels={curriculumLevels()}
                />
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
                <h2>Optional subject ads</h2>
                <p className="muted">
                  Extra subject-specific ads on top of your profile. Not required to get found.
                </p>
                <TutorAdsManager subjects={catalogSubjects} extraLevels={curriculumLevels()} />
              </section>
              <section className="panel" style={{ gridColumn: "1 / -1" }}>
                <h2>Get verified</h2>
                <p className="muted">
                  Required: a government photo ID (passport, national ID / CNIC, or driving licence).
                  Recommended: your highest qualification. Documents stay private — admins only.
                  The Verified Tutor add-on on Pricing prioritises your request.
                </p>
                <VerificationForm />
              </section>
            </>
          )}

          {user.role === "STUDENT" && (
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
          )}
        </div>
      </div>
    </div>
  );
}
