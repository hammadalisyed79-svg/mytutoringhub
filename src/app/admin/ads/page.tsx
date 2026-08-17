import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton, AdminHideAdButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; kind?: string; status?: string }>;

export default async function AdminAdsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const kind = sp.kind || "all";

  const studentWhere = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const tutorWhere = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
            { tutorProfile: { user: { email: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [studentAds, tutorAds] = await Promise.all([
    kind === "tutor"
      ? Promise.resolve([])
      : prisma.studentAd.findMany({
          where: studentWhere,
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
    kind === "student"
      ? Promise.resolve([])
      : prisma.tutorAd.findMany({
          where: tutorWhere,
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { tutorProfile: { include: { user: { select: { id: true, name: true, email: true } } } } },
        }),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Ads</h1>
        <p className="muted">Moderate student requests and tutor subject ads. Hide or delete inappropriate posts.</p>
      </div>

      <form className="filters filters-wide" method="get">
        <label>
          Search
          <input name="q" defaultValue={sp.q || ""} placeholder="Title, subject, email" />
        </label>
        <label>
          Type
          <select name="kind" defaultValue={kind}>
            <option value="all">All</option>
            <option value="student">Student ads</option>
            <option value="tutor">Tutor ads</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={sp.status || ""}>
            <option value="">Any</option>
            <option value="OPEN">Open</option>
            <option value="ACTIVE">Active</option>
            <option value="HIDDEN">Hidden</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {kind !== "tutor" && (
        <section className="panel">
          <h2>Student ads</h2>
          {studentAds.length === 0 && <p className="muted">No student ads match.</p>}
          <div className="results">
            {studentAds.map((ad) => (
              <article key={ad.id} className="ad-row">
                <strong>
                  {ad.title} ({ad.status})
                </strong>
                <span className="muted">
                  {ad.subject} · {ad.location} ·{" "}
                  <Link href={`/admin/users/${ad.user.id}`}>
                    {ad.user.name} ({ad.user.email})
                  </Link>
                </span>
                <p style={{ margin: 0 }}>{ad.description.slice(0, 220)}</p>
                <div className="admin-actions">
                  {ad.status !== "HIDDEN" && <AdminHideAdButton id={ad.id} />}
                  {ad.status === "HIDDEN" && (
                    <AdminActionButton action="open_ad" id={ad.id} label="Restore" />
                  )}
                  <AdminActionButton
                    action="delete_student_ad"
                    id={ad.id}
                    label="Delete"
                    confirm="Delete this student ad?"
                    danger
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {kind !== "student" && (
        <section className="panel">
          <h2>Tutor ads</h2>
          {tutorAds.length === 0 && <p className="muted">No tutor ads match.</p>}
          <div className="results">
            {tutorAds.map((ad) => (
              <article key={ad.id} className="ad-row">
                <strong>
                  {ad.title} ({ad.status})
                </strong>
                <span className="muted">
                  {ad.subject} · {ad.location} ·{" "}
                  <Link href={`/admin/tutors/${ad.tutorProfile.id}`}>{ad.tutorProfile.user.name}</Link>
                </span>
                <div className="admin-actions">
                  {ad.status !== "HIDDEN" && (
                    <AdminActionButton action="hide_tutor_ad" id={ad.id} label="Hide" />
                  )}
                  {ad.status === "HIDDEN" && (
                    <AdminActionButton action="restore_tutor_ad" id={ad.id} label="Restore" />
                  )}
                  <AdminActionButton
                    action="delete_tutor_ad"
                    id={ad.id}
                    label="Delete"
                    confirm="Delete this tutor ad?"
                    danger
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
