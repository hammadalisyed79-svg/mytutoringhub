import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AdminActionButton, AdminBoostForm, AdminToggleTutorButton } from "@/components/AdminActions";
import { getTutorSupplyOverview } from "@/lib/tutor-supply-metrics";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";
import { isSuspiciousDisplayName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  active?: string;
  verified?: string;
  supply?: string;
}>;

export default async function AdminTutorsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const supply = sp.supply || "";

  const where: Prisma.TutorProfileWhereInput = {};
  if (sp.active === "1") where.active = true;
  if (sp.active === "0") where.active = false;
  if (sp.verified === "1") where.verified = true;
  if (sp.verified === "0") where.verified = false;
  if (supply === "incomplete") {
    where.active = false;
    where.user = { ...(where.user as object), role: "TUTOR", suspended: false };
  }
  if (supply === "suspended") {
    where.user = { ...(where.user as object), suspended: true };
  }
  if (q) {
    where.OR = [
      { subjects: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { headline: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [overview, staleAdRates, tutors] = await Promise.all([
    getTutorSupplyOverview(),
    prisma.tutorAd.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        subject: true,
        rate: true,
        tutorProfile: {
          select: {
            id: true,
            hourlyRate: true,
            user: { select: { name: true } },
          },
        },
      },
      take: 100,
    }),
    prisma.tutorProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        user: { select: { id: true, name: true, email: true, suspended: true, emailVerified: true } },
      },
    }),
  ]);

  const staleAds = staleAdRates.filter(
    (ad) => ad.tutorProfile && ad.rate !== ad.tutorProfile.hourlyRate,
  );

  const rows = tutors.map((t) => {
    const completion = getTutorProfileCompletion({
      name: t.user.name,
      photoUrl: t.photoUrl,
      headline: t.headline,
      bio: t.bio,
      country: t.country,
      location: t.location,
      subjects: t.subjects,
      hourlyRate: t.hourlyRate,
      online: t.online,
      inPerson: t.inPerson,
      qualifications: t.qualifications,
    });
    const suspicious = isSuspiciousDisplayName(t.user.name);
    return { t, completion, suspicious };
  });

  const filtered =
    supply === "incomplete"
      ? rows.filter((r) => !r.t.active && !r.t.user.suspended && !r.suspicious && !r.completion.complete)
      : supply === "suspicious"
        ? rows.filter((r) => r.suspicious)
        : rows;

  return (
    <>
      <div>
        <h1 className="page-title">Tutor listings</h1>
        <p className="muted">
          Supply overview for follow-up. Eligibility standards are unchanged — incomplete tutors stay
          hidden until they qualify.
        </p>
      </div>

      <div className="admin-stat-grid">
        <Link href="/admin/tutors" className="admin-stat">
          <strong>{overview.totalTutorAccounts.toLocaleString()}</strong>
          <span>Tutor accounts</span>
        </Link>
        <Link href="/admin/tutors?active=1" className="admin-stat">
          <strong>{overview.live.toLocaleString()}</strong>
          <span>Live / public</span>
        </Link>
        <Link href="/admin/tutors?supply=incomplete" className="admin-stat">
          <strong>{overview.incomplete.toLocaleString()}</strong>
          <span>Incomplete (eligible outreach)</span>
        </Link>
        <Link href="/admin/tutors?supply=suspended" className="admin-stat">
          <strong>{overview.suspended.toLocaleString()}</strong>
          <span>Suspended</span>
        </Link>
        <Link href="/admin/tutors?supply=suspicious" className="admin-stat">
          <strong>{overview.suspiciousHidden.toLocaleString()}</strong>
          <span>Suspicious / review</span>
        </Link>
        <div className="admin-stat">
          <strong>{overview.newlyLiveThisWeek.toLocaleString()}</strong>
          <span>Updated live (7 days)</span>
        </div>
      </div>

      <p className="muted">
        Never started: {overview.neverStarted} · Unverified email (hidden): {overview.unverifiedEmail}{" "}
        · Recovery dry-run:{" "}
        <code>npx tsx scripts/tutor-recovery-dry-run.ts</code>
      </p>

      {staleAds.length > 0 && (
        <section className="panel">
          <h2>Stale tutor ad rates (review only)</h2>
          <p className="muted">
            Active ads whose rate differs from the tutor profile hourly rate. Not auto-corrected —
            ask the tutor to update or edit in admin.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Ad</th>
                  <th>Ad rate (PKR)</th>
                  <th>Profile rate (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {staleAds.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      <Link href={`/admin/tutors/${ad.tutorProfile!.id}`}>
                        {ad.tutorProfile!.user.name}
                      </Link>
                    </td>
                    <td>
                      {ad.title} ({ad.subject})
                    </td>
                    <td>{ad.rate.toLocaleString()}</td>
                    <td>{ad.tutorProfile!.hourlyRate.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <form className="filters filters-wide" method="get">
        <label>
          Search
          <input name="q" defaultValue={sp.q || ""} placeholder="Name, email, subject, city" />
        </label>
        <label>
          Listing
          <select name="active" defaultValue={sp.active || ""}>
            <option value="">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </label>
        <label>
          Supply
          <select name="supply" defaultValue={sp.supply || ""}>
            <option value="">Any</option>
            <option value="incomplete">Incomplete (follow-up)</option>
            <option value="suspicious">Suspicious name</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label>
          Badge
          <select name="verified" defaultValue={sp.verified || ""}>
            <option value="">Any</option>
            <option value="1">Verified</option>
            <option value="0">Unverified</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {filtered.length === 0 && <p className="muted">No tutor profiles match.</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tutor</th>
              <th>Subjects</th>
              <th>Completion</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ t, completion, suspicious }) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/admin/tutors/${t.id}`}>
                    <strong>{t.user.name}</strong>
                  </Link>
                  <div className="muted">{t.user.email}</div>
                </td>
                <td>{t.subjects || "—"}</td>
                <td>
                  {completion.requiredDone}/{completion.requiredTotal}
                  {!completion.complete && completion.missingRequired.length > 0 ? (
                    <div className="muted">{completion.missingRequired.slice(0, 3).join(", ")}</div>
                  ) : null}
                </td>
                <td>
                  {t.active ? "Live" : "Hidden"}
                  {t.forceActive ? " · forced" : ""}
                  {t.verified ? " · Verified" : ""}
                  {t.highlighted || (t.highlightedUntil && t.highlightedUntil > new Date())
                    ? " · Highlighted"
                    : ""}
                  {t.user.suspended ? " · Suspended" : ""}
                  {suspicious ? " · Suspicious name" : ""}
                  {!t.user.emailVerified ? " · Email unverified" : ""}
                </td>
                <td>
                  <div className="admin-actions">
                    <Link href={`/admin/tutors/${t.id}`}>Edit</Link>
                    <AdminToggleTutorButton id={t.id} active={t.active} />
                    <AdminActionButton
                      action="set_verified"
                      id={t.id}
                      label={t.verified ? "Unverify" : "Verify"}
                      extra={{ verified: !t.verified }}
                    />
                    <AdminBoostForm id={t.id} action="set_highlight" label="Highlight days" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
