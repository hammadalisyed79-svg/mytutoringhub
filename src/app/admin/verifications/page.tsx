import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { AdminVerificationQueueItem } from "@/components/AdminVerificationQueueItem";
import {
  countResolvedVerificationRows,
  dedupeVerificationQueue,
} from "@/lib/verification-queue";
import { hasActivePlan } from "@/lib/subscription";

export const metadata = { title: "Verifications · Admin" };

export default async function AdminVerificationsPage() {
  await requireAdminPage();
  const raw = await prisma.verificationRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
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

  return (
    <section className="panel">
      <h2>Verification requests</h2>
      <p className="muted">
        Approve photo ID and certificate submissions to grant the verified tutor badge. Pending
        Priority Verification Review purchases appear first (oldest first within that group) —
        payment never auto-awards Identity Verified.
        {priorityPending > 0 ? <> {priorityPending} priority pending.</> : null}
        {hiddenResolved > 0 ? (
          <>
            {" "}
            Showing the latest decision per tutor ({hiddenResolved} older duplicate
            {hiddenResolved === 1 ? "" : "s"} hidden).
          </>
        ) : null}
      </p>
      {verifications.length === 0 && <p className="muted">No requests yet.</p>}
      <div className="admin-verify-queue">
        {verifications.map((v) => (
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
    </section>
  );
}
