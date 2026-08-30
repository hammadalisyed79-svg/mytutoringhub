import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton, AdminHideAdButton, AdminBoostForm } from "@/components/AdminActions";
import { listingPath } from "@/lib/subject-profile";

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
  const listingWhere = {
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

  const [studentAds, listings] = await Promise.all([
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
      : prisma.subjectProfile.findMany({
          where: listingWhere,
          orderBy: { createdAt: "desc" },
          take: 60,
          include: {
            tutorProfile: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        }),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Ads &amp; listings</h1>
        <p className="muted">
          Moderate student requests and tutor subject profiles. Hide, pause, or delete inappropriate
          listings. Canonical-subject duplicates:{" "}
          <Link href="/admin/teaching-profiles">Teaching Profile report</Link> (read-only).
        </p>
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
            <option value="student">Student requests</option>
            <option value="tutor">Subject profiles</option>
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
          <h2>Student requests</h2>
          {studentAds.length === 0 && <p className="muted">No student requests match.</p>}
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
          <h2>Subject profiles</h2>
          {listings.length === 0 && <p className="muted">No subject profiles match.</p>}
          <div className="results">
            {listings.map((listing) => (
              <article key={listing.id} className="ad-row">
                <strong>
                  {listing.title} ({listing.status})
                </strong>
                <span className="muted">
                  {listing.subject} · {listing.location} ·{" "}
                  <Link href={`/admin/tutors/${listing.tutorProfile.id}`}>
                    {listing.tutorProfile.user.name}
                  </Link>
                  {" · "}
                  <Link href={listingPath(listing.id)}>Public</Link>
                </span>
                <div className="admin-actions">
                  {listing.status !== "HIDDEN" && (
                    <AdminActionButton
                      action="hide_subject_profile"
                      id={listing.id}
                      label="Hide"
                    />
                  )}
                  {listing.status === "HIDDEN" && (
                    <AdminActionButton
                      action="restore_subject_profile"
                      id={listing.id}
                      label="Restore"
                    />
                  )}
                  {listing.status === "ACTIVE" && (
                    <AdminActionButton
                      action="pause_subject_profile"
                      id={listing.id}
                      label="Pause"
                    />
                  )}
                  <AdminActionButton
                    action="delete_subject_profile"
                    id={listing.id}
                    label="Delete"
                    confirm="Delete this subject profile?"
                    danger
                  />
                </div>
                <div className="admin-actions" style={{ marginTop: "0.5rem" }}>
                  <AdminBoostForm
                    id={listing.id}
                    action="set_listing_highlight"
                    label="Highlight days"
                  />
                  <AdminBoostForm id={listing.id} action="set_listing_boost" label="Boost days" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
