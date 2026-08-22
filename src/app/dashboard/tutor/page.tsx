import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { VerificationForm } from "@/components/VerificationForm";
import { TutorAdsManager } from "@/components/TutorAdsManager";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { ResendVerificationButton } from "@/components/ResendVerificationButton";
import { RecoverPaymentForm } from "@/components/RecoverPaymentForm";
import { getPlan } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import {
  type DashboardSearchParams,
  prepareDashboardHome,
  profileStrength,
  roleDashboardPath,
} from "@/lib/dashboard-home";

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
  const { user, currency, catalogSubjects, extraLevels, pendingSubs, corePlan, addOnSubs } =
    await prepareDashboardHome(session.user.id, "TUTOR", sp);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Hi, {user.name}</h1>
        <p className="muted">
          Complete your profile to appear in search, then reply to student requests.
        </p>

        {sp.verified === "1" && (
          <p className="success panel" style={{ marginTop: "1rem" }}>
            Email verified. Messaging and ads unlock with your plan.
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
                ranking, unlimited enquiry reveals, and subject ads (complimentary until 30
                September 2026).
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
                  plan="TUTOR_BASIC"
                  currency={currency}
                  label="Activate Tutor Basic free"
                  complimentary
                />
              </div>
            )}
            <p style={{ marginTop: "0.85rem", marginBottom: 0 }}>
              <Link href="/dashboard/tutor/plan">Your plan details</Link>
              {" · "}
              <Link href="/pricing">Tutor add-ons →</Link>
            </p>
            {!corePlan && <RecoverPaymentForm />}
          </section>

          <section className="panel">
            <h2>Tutor shortcuts</h2>
            <div className="dash-links">
              <Link href="/ads">Student requests</Link>
              <Link href="/messages">Messages</Link>
              <Link href="/past-papers">Past papers</Link>
              <Link href="/dashboard/tutor/analytics">Analytics</Link>
              <Link href="/dashboard/tutor/plan">Your plan</Link>
              <Link href="/settings">Account settings</Link>
            </div>
          </section>

          {user.tutorProfile && (
            <>
              <section className="panel" style={{ gridColumn: "1 / -1" }}>
                <h2>Your tutor profile</h2>
                <p className="muted">
                  Status:{" "}
                  {user.tutorProfile.active
                    ? "Listed in search"
                    : "Hidden until profile is complete (subjects + headline or photo)"}{" "}
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
                          Complete your profile to get listed in search for free — add{" "}
                          {missing.join(", ")}. Tutor Basic adds priority when you&apos;re ready to
                          grow.
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
                    Students cannot see this listing yet. Add subjects and a headline (or photo),
                    then save — free complete profiles appear in search. Tutor Basic adds priority
                    ranking, unlimited reveals, and ads.
                  </p>
                )}
                <TutorProfileForm
                  initial={user.tutorProfile}
                  displayName={user.name}
                  subjects={catalogSubjects}
                  extraLevels={extraLevels}
                />
                <p style={{ marginTop: "1rem" }}>
                  {user.tutorProfile.active ? (
                    <Link href={`/tutors/${user.tutorProfile.id}`}>View public profile</Link>
                  ) : (
                    <>
                      <Link href={`/tutors/${user.tutorProfile.id}`}>Preview your profile</Link>
                      <span className="muted">
                        {" "}
                        (only you can see it until subjects and a headline or photo are saved)
                      </span>
                    </>
                  )}
                </p>
              </section>
              <section className="panel" style={{ gridColumn: "1 / -1" }}>
                <h2>Optional subject ads</h2>
                <p className="muted">
                  Extra subject-specific ads on top of your profile. Not required to get found.
                </p>
                <TutorAdsManager subjects={catalogSubjects} extraLevels={extraLevels} />
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
        </div>
      </div>
    </div>
  );
}
