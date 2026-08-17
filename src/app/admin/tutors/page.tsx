import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AdminActionButton, AdminBoostForm, AdminToggleTutorButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; active?: string; verified?: string }>;

export default async function AdminTutorsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const where: Prisma.TutorProfileWhereInput = {};
  if (sp.active === "1") where.active = true;
  if (sp.active === "0") where.active = false;
  if (sp.verified === "1") where.verified = true;
  if (sp.verified === "0") where.verified = false;
  if (q) {
    where.OR = [
      { subjects: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { headline: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const tutors = await prisma.tutorProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { id: true, name: true, email: true, suspended: true } } },
  });

  return (
    <>
      <div>
        <h1 className="page-title">Tutor listings</h1>
        <p className="muted">Includes inactive profiles. Verify, activate, highlight, or edit.</p>
      </div>

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

      {tutors.length === 0 && <p className="muted">No tutor profiles match.</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tutor</th>
              <th>Subjects</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/admin/tutors/${t.id}`}>
                    <strong>{t.user.name}</strong>
                  </Link>
                  <div className="muted">{t.user.email}</div>
                </td>
                <td>{t.subjects || "—"}</td>
                <td>
                  {t.active ? "Active" : "Inactive"}
                  {t.forceActive ? " · forced" : ""}
                  {t.verified ? " · Verified" : ""}
                  {t.highlighted || (t.highlightedUntil && t.highlightedUntil > new Date())
                    ? " · Highlighted"
                    : ""}
                  {t.user.suspended ? " · Suspended" : ""}
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
