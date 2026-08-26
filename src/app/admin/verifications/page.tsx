import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { AdminVerificationQueueItem } from "@/components/AdminVerificationQueueItem";
import {
  countResolvedVerificationRows,
  dedupeVerificationQueue,
} from "@/lib/verification-queue";

export const metadata = { title: "Verifications · Admin" };

export default async function AdminVerificationsPage() {
  await requireAdminPage();
  const raw = await prisma.verificationRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const verifications = dedupeVerificationQueue(raw);
  const hiddenResolved = countResolvedVerificationRows(raw) - countResolvedVerificationRows(verifications);

  return (
    <section className="panel">
      <h2>Verification requests</h2>
      <p className="muted">
        Approve photo ID and certificate submissions to grant the verified tutor badge.
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
          />
        ))}
      </div>
    </section>
  );
}
