import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { BillingPortalButton } from "@/components/BillingPortalButton";
import { getPlan } from "@/lib/plans";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; subscribed?: string; plan?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" } },
      tutorProfile: true,
      studentAds: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Hi, {user.name}</h1>
        <p className="muted">
          Role: {user.role.toLowerCase()} · Manage your profile, subscriptions, and activity.
        </p>
        {(sp.checkout === "success" || sp.subscribed === "1") && (
          <p className="success panel" style={{ marginTop: "1rem" }}>
            Payment confirmed. Your plan is active
            {sp.plan ? ` (${getPlan(sp.plan as never)?.name || sp.plan})` : ""}.
          </p>
        )}

        <div className="dashboard-grid" style={{ marginTop: "1.5rem" }}>
          <section className="panel">
            <h2>Subscriptions</h2>
            {user.subscriptions.length === 0 && (
              <p className="muted">No plans yet. Subscribe to unlock messaging.</p>
            )}
            <ul>
              {user.subscriptions.map((s) => (
                <li key={s.id}>
                  {getPlan(s.plan as never)?.name || s.plan} — {s.status}
                  {s.currentPeriodEnd
                    ? ` · until ${s.currentPeriodEnd.toLocaleDateString()}`
                    : ""}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <Link href="/pricing" className="btn btn-sm">
                View plans
              </Link>
              <BillingPortalButton />
            </div>
          </section>

          <section className="panel">
            <h2>Quick links</h2>
            <div className="footer-links" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <Link href="/search">Browse tutors</Link>
              <Link href="/ads">Student ads</Link>
              <Link href="/messages">Messages</Link>
              {user.role === "ADMIN" && <Link href="/admin">Admin panel</Link>}
            </div>
          </section>

          {user.role === "TUTOR" && user.tutorProfile && (
            <section className="panel" style={{ gridColumn: "1 / -1" }}>
              <h2>Your tutor profile</h2>
              <p className="muted">
                Status: {user.tutorProfile.active ? "Listed" : "Hidden until Tutor Basic is active"} ·{" "}
                {user.tutorProfile.verified ? "Verified" : "Not verified"} ·{" "}
                {user.tutorProfile.highlighted ? "Highlighted" : "Standard listing"}
              </p>
              <TutorProfileForm initial={user.tutorProfile} />
              <p style={{ marginTop: "1rem" }}>
                <Link href={`/tutors/${user.tutorProfile.id}`}>View public profile</Link>
              </p>
            </section>
          )}

          {user.role === "STUDENT" && (
            <section className="panel" style={{ gridColumn: "1 / -1" }}>
              <h2>Your ads</h2>
              {user.studentAds.length === 0 && <p className="muted">You have not posted any requests.</p>}
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
