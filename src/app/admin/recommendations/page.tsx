import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function AdminRecommendationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = sp.status || "PENDING";

  const items = await prisma.tutorRecommendation.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      tutorProfile: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return (
    <>
      <div>
        <h1 className="page-title">Tutor recommendations</h1>
        <p className="muted">
          Verify off-platform recommendations before they appear on tutor profiles and count toward
          badge progression.
        </p>
      </div>

      <form className="filters" method="get">
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {items.length === 0 && <p className="muted">No recommendations in this view.</p>}

      <div className="results">
        {items.map((item) => (
          <article key={item.id} className="ad-row">
            <strong>
              {item.status} · {item.recommenderName}
              {item.relationship ? ` (${item.relationship})` : ""} → {item.tutorProfile.user.name}
            </strong>
            <p style={{ margin: "0.35rem 0", whiteSpace: "pre-wrap" }}>{item.comment}</p>
            <span className="muted">
              Tutor: {item.tutorProfile.user.email} · {item.createdAt.toLocaleString()}
              {item.recommenderEmail ? ` · Contact: ${item.recommenderEmail}` : ""}
            </span>
            {item.proofUrl && (
              <p style={{ margin: "0.35rem 0 0" }}>
                <a href={item.proofUrl} target="_blank" rel="noreferrer">
                  View supporting document
                </a>
              </p>
            )}
            <div className="admin-actions">
              <Link href={`/admin/tutors/${item.tutorProfileId}`}>Tutor profile</Link>
              {item.status !== "APPROVED" && (
                <AdminActionButton action="recommendation_approve" id={item.id} label="Approve" />
              )}
              {item.status !== "REJECTED" && (
                <AdminActionButton
                  action="recommendation_reject"
                  id={item.id}
                  label="Reject"
                  danger
                />
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
