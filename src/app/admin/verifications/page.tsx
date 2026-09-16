import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { AdminVerificationQueueItem } from "@/components/AdminVerificationQueueItem";
import {
  countResolvedVerificationRows,
  dedupeVerificationQueue,
} from "@/lib/verification-queue";
import { hasActivePlan } from "@/lib/subscription";
import { ADMIN_PAGE_SIZE, adminListQuery } from "@/lib/admin-list";

export const metadata = { title: "Verifications · Admin" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const statusFilter = sp.status || "";

  const raw = await prisma.verificationRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: { createdAt: "desc" },
    take: 400,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const pendingUserIds = [
    ...new Set(raw.filter((r) => r.status === "PENDING").map((r) => r.userId)),
  ];
  const priorityFlags = await Promise.all(
    pendingUserIds.map(
      async (userId) => [userId, await hasActivePlan(userId, "VERIFIED_TUTOR")] as const,
    ),
  );
  const prioritySet = new Set(priorityFlags.filter(([, ok]) => ok).map(([id]) => id));

  const enriched = raw.map((row) => ({
    ...row,
    hasPriorityReview: row.status === "PENDING" && prioritySet.has(row.userId),
  }));

  const verifications = dedupeVerificationQueue(enriched);
  const hiddenResolved =
    countResolvedVerificationRows(raw) - countResolvedVerificationRows(verifications);
  const priorityPending = verifications.filter(
    (v) => v.status === "PENDING" && v.hasPriorityReview,
  ).length;

  const total = verifications.length;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const pageRows = verifications.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <>
      <div>
        <h1 className="page-title">Verifications</h1>
        <p className="muted">
          Approve photo ID and certificate submissions to grant the verified tutor badge. Pending
          Priority Verification Review purchases appear first — payment never auto-awards Identity
          Verified.
          {priorityPending > 0 ? <> {priorityPending} priority pending.</> : null}
          {hiddenResolved > 0 ? (
            <>
              {" "}
              Showing the latest decision per tutor ({hiddenResolved} older duplicate
              {hiddenResolved === 1 ? "" : "s"} hidden).
            </>
          ) : null}
        </p>
      </div>

      <form className="filters filters-wide" method="get">
        <label>
          Status
          <select name="status" defaultValue={statusFilter}>
            <option value="">Any</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      <p className="muted">
        {total} request{total === 1 ? "" : "s"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      {pageRows.length === 0 && <p className="muted">No requests match.</p>}
      <div className="admin-verify-queue">
        {pageRows.map((v) => (
          <AdminVerificationQueueItem
            key={v.id}
            id={v.id}
            status={v.status}
            createdAt={v.createdAt}
            adminNote={v.adminNote}
            user={v.user}
            docUrls={v.docUrls}
            notes={v.notes}
            showActions={v.status === "PENDING"}
            priorityReview={Boolean(v.hasPriorityReview)}
          />
        ))}
      </div>

      {pages > 1 && (
        <p className="muted admin-pager">
          Page {page} of {pages}
          {page > 1 && (
            <>
              {" "}
              <Link href={`/admin/verifications?${adminListQuery(sp, page - 1)}`}>Previous</Link>
            </>
          )}
          {page < pages && (
            <>
              {" "}
              <Link href={`/admin/verifications?${adminListQuery(sp, page + 1)}`}>Next</Link>
            </>
          )}
        </p>
      )}
    </>
  );
}
