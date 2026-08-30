import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileBoostPanel } from "@/components/ProfileBoostPanel";
import { getVisitorCurrency } from "@/lib/visitor-currency";

export const metadata = { title: "Analytics — Tutor Dashboard" };
export const dynamic = "force-dynamic";

function hasPaidTutorPlan(subscriptions: { plan: string; status: string }[]) {
  return subscriptions.some(
    (s) =>
      ["ACTIVE", "TRIALING"].includes(s.status) &&
      ["TUTOR_BASIC", "VERIFIED_TUTOR", "HIGHLIGHTED_AD", "AD_BOOST", "EXTRA_PROFILE_ADS", "UNLIMITED_ADS"].includes(
        s.plan,
      ),
  );
}

function profileCompleteness(profile: {
  photoUrl: string | null;
  bio: string;
  subjects: string;
  hourlyRate: number;
  availability: string | null;
}): number {
  let score = 0;
  if (profile.photoUrl) score += 20;
  if (profile.bio && profile.bio.length > 30) score += 20;
  if (profile.subjects && profile.subjects.length > 0) score += 20;
  if (profile.hourlyRate > 0) score += 20;
  if (profile.availability && profile.availability.length > 0) score += 20;
  return score;
}

function weeksAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function TutorAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TUTOR") redirect("/dashboard");

  const currency = await getVisitorCurrency();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: {
      tutorProfile: true,
      subscriptions: { orderBy: { createdAt: "desc" } },
    },
  });

  const profile = user.tutorProfile;
  if (!profile) redirect("/dashboard");

  const listed = Boolean(profile.active);
  const hasPaidPlan = hasPaidTutorPlan(user.subscriptions);
  const completeness = profileCompleteness(profile);

  let totalEnquiries = 0;
  let recentConversations: {
    id: string;
    createdAt: Date;
    userA: { name: string };
    relatedAdId: string | null;
  }[] = [];

  try {
    const asA = await prisma.conversation.findMany({
      where: { userAId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        relatedAdId: true,
        userB: { select: { name: true } },
      },
    });
    const asB = await prisma.conversation.findMany({
      where: { userBId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        relatedAdId: true,
        userA: { select: { name: true } },
      },
    });

    recentConversations = [
      ...asB.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        relatedAdId: c.relatedAdId,
        userA: c.userA,
      })),
      ...asA.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        relatedAdId: c.relatedAdId,
        userA: { name: c.userB.name },
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 40);

    totalEnquiries = await prisma.conversation.count({
      where: {
        OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
      },
    });
  } catch {
    // table may not exist yet
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let profileViewsThisMonth = 0;
  try {
    profileViewsThisMonth = await prisma.profileView.count({
      where: { tutorId: profile.id, viewedAt: { gte: monthStart } },
    });
  } catch {
    profileViewsThisMonth = 0;
  }

  const weekLabels: string[] = [];
  const weekCounts: number[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = weeksAgo(i);
    const weekEnd = weeksAgo(i - 1);
    const label = `${weekStart.toLocaleString("default", { month: "short" })} ${weekStart.getDate()}`;
    weekLabels.push(label);
    weekCounts.push(
      recentConversations.filter((c) => c.createdAt >= weekStart && c.createdAt < weekEnd).length,
    );
  }

  const hasRealData = weekCounts.some((c) => c > 0);
  const displayCounts = weekCounts;
  const maxCount = Math.max(...displayCounts, 1);

  const subjectList = profile.subjects
    ? profile.subjects.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let subjectCounts: Record<string, number> = {};
  try {
    const listings = await prisma.subjectProfile.findMany({
      where: { tutorProfileId: profile.id },
      select: { id: true, subject: true },
    });
    const listingSubjectMap = Object.fromEntries(listings.map((a) => [a.id, a.subject]));

    for (const conv of recentConversations) {
      if (conv.relatedAdId && listingSubjectMap[conv.relatedAdId]) {
        const sub = listingSubjectMap[conv.relatedAdId];
        subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;
      }
    }
  } catch {
    subjectCounts = {};
  }

  const topSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (topSubjects.length === 0 && subjectList.length > 0) {
    subjectList.slice(0, 6).forEach((s) => {
      topSubjects.push([s, 0]);
    });
  }

  const activityFeed: { label: string; time: Date; type: "enquiry" | "view" | "reveal" }[] = [];

  recentConversations.slice(0, 8).forEach((c) => {
    activityFeed.push({
      label: `Conversation with ${c.userA.name}`,
      time: c.createdAt,
      type: "enquiry",
    });
  });

  activityFeed.sort((a, b) => b.time.getTime() - a.time.getTime());

  let revealCount = 0;
  try {
    const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
    revealCount = await prisma.usageEvent.count({
      where: {
        userId: session.user.id,
        type: { in: ["enquiry_reveal", "tutor_contact"] },
        month: monthKey,
      },
    });
  } catch {
    revealCount = 0;
  }

  const revealRate =
    totalEnquiries > 0 ? Math.round((revealCount / totalEnquiries) * 100) : 0;

  const listingColor = listed ? "var(--ok)" : "var(--muted)";

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link href="/dashboard/tutor" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            ← Dashboard
          </Link>
        </div>
        <h1 className="page-title">Analytics</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <StatCard
            label="Profile views this month"
            value={profileViewsThisMonth}
            note="Public profile visits (not your own)"
            color="var(--brand)"
          />
          <StatCard label="Total conversations" value={totalEnquiries} color="var(--ok)" />
          <StatCard
            label="Contact events (MTD)"
            value={revealCount}
            note={totalEnquiries > 0 ? `${revealRate}% of conversations` : "No conversations yet"}
            color="var(--ink)"
          />
          <StatCard
            label="Profile completeness"
            value={`${completeness}%`}
            color={
              completeness >= 80 ? "var(--ok)" : completeness >= 40 ? "var(--brand)" : "var(--accent)"
            }
            bar={completeness}
          />
        </div>

        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>
            Conversations — last 8 weeks
            {!hasRealData && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 400,
                  color: "var(--muted)",
                  marginLeft: "0.5rem",
                }}
              >
                (no conversations in this window yet)
              </span>
            )}
          </h2>
          {!hasRealData ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
              When students message you, weekly counts will appear here.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "0.5rem",
                height: 140,
                paddingBottom: "1.5rem",
                position: "relative",
              }}
            >
              {displayCounts.map((count, i) => {
                const heightPct = Math.round((count / maxCount) * 100);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1 }}>
                      {count > 0 ? count : ""}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        minHeight: 4,
                        background: "var(--brand)",
                        borderRadius: "3px 3px 0 0",
                        opacity: 0.8,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--muted)",
                        position: "absolute",
                        bottom: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {weekLabels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <section className="panel">
            <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Top subjects</h2>
            {topSubjects.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                No subject data yet. Add subjects to your profile to track this.
              </p>
            ) : (
              <ol
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {topSubjects.map(([subject, count], i) => (
                  <li
                    key={subject}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.88rem",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ color: "var(--muted)", minWidth: "1rem" }}>{i + 1}.</span>
                      {subject}
                    </span>
                    <span
                      style={{
                        background: "var(--paper-deep)",
                        borderRadius: "999px",
                        padding: "0.1em 0.65em",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel">
            <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Search visibility</h2>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
              Search impression tracking is not enabled yet.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  background: listingColor,
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "0.18em 0.75em",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {hasPaidPlan ? "Tutor Pro+" : listed ? "Free listing" : "Not listed"}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>plan</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
              {listed
                ? hasPaidPlan
                  ? "Listed with paid priority. Listing Boost strengthens one Teaching Profile among relevant matches for 30 days."
                  : "Listed in search for free. Tutor Pro adds priority ranking and unlimited enquiry reveals."
                : "Complete your profile (subjects + headline or photo) to appear in search."}
            </p>
          </section>
        </div>

        {profile && <ProfileBoostPanel currency={currency} compact />}

        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Recent activity</h2>
          {activityFeed.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No activity yet.</p>
          ) : (
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {activityFeed.map((event, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.88rem",
                    padding: "0.35rem 0",
                    borderBottom: i < activityFeed.length - 1 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ActivityDot type={event.type} />
                    {event.label}
                  </span>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.78rem",
                      whiteSpace: "nowrap",
                      marginLeft: "1rem",
                    }}
                  >
                    {event.time.toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!listed && (
          <section
            className="panel"
            style={{
              borderColor: "var(--brand)",
              background: "rgba(15, 90, 70, 0.05)",
            }}
          >
            <h2
              style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700, color: "var(--brand)" }}
            >
              Complete your profile to appear in search
            </h2>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
              Add subjects and a headline (or photo) on your dashboard. Tutor Pro is optional for
              priority ranking and unlimited enquiry reveals — verification, highlight, and boost stay
              on Pricing (boost each subject profile from your dashboard).
            </p>
            <Link
              href="/dashboard/tutor"
              style={{
                background: "var(--brand)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "0.4em 1.1em",
                fontSize: "0.9rem",
                fontWeight: 600,
                display: "inline-block",
              }}
            >
              Edit tutor profile →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  color,
  bar,
}: {
  label: string;
  value: string | number;
  note?: string;
  color?: string;
  bar?: number;
}) {
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span
        style={{
          fontSize: "0.78rem",
          color: "var(--muted)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "1.6rem",
          fontWeight: 800,
          color: color || "var(--ink)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {bar !== undefined && (
        <div
          style={{
            height: 4,
            background: "var(--paper-deep)",
            borderRadius: 999,
            overflow: "hidden",
            marginTop: "0.25rem",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${bar}%`,
              background: color || "var(--brand)",
              borderRadius: 999,
            }}
          />
        </div>
      )}
      {note && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{note}</span>}
    </div>
  );
}

function ActivityDot({ type }: { type: "enquiry" | "view" | "reveal" }) {
  const colors: Record<string, string> = {
    enquiry: "var(--brand)",
    view: "var(--ok)",
    reveal: "var(--accent)",
  };
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: colors[type] || "var(--muted)",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
