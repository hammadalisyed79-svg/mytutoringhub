import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = sp.status || "";

  const reviews = await prisma.review.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      student: { select: { id: true, name: true } },
      tutorProfile: { include: { user: { select: { name: true } } } },
    },
  });

  return (
    <>
      <div>
        <h1 className="page-title">Reviews</h1>
        <p className="muted">Publish, hide, or delete spam. Pending reviews are not shown on public profiles.</p>
      </div>

      <form className="filters" method="get">
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PUBLISHED">Published</option>
            <option value="HIDDEN">Hidden</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {reviews.length === 0 && <p className="muted">No reviews in this view.</p>}

      <div className="results">
        {reviews.map((r) => (
          <article key={r.id} className="ad-row">
            <strong>
              {r.rating}/5 · {r.status} — {r.student.name} → {r.tutorProfile.user.name}
            </strong>
            <p style={{ margin: 0 }}>{r.comment}</p>
            <span className="muted">{r.createdAt.toLocaleString()}</span>
            <div className="admin-actions">
              <Link href={`/admin/tutors/${r.tutorProfileId}`}>Tutor</Link>
              {r.status !== "PUBLISHED" && (
                <AdminActionButton action="review_publish" id={r.id} label="Publish" />
              )}
              {r.status !== "HIDDEN" && (
                <AdminActionButton action="review_hide" id={r.id} label="Hide" />
              )}
              <AdminActionButton
                action="review_delete"
                id={r.id}
                label="Delete"
                confirm="Permanently delete this review?"
                danger
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
