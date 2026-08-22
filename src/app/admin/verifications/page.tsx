import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { AdminVerificationQueueItem } from "@/components/AdminVerificationQueueItem";

export const metadata = { title: "Verifications · Admin" };

export default async function AdminVerificationsPage() {
  await requireAdminPage();
  const verifications = await prisma.verificationRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <section className="panel">
      <h2>Verification requests</h2>
      <p className="muted">
        Approve photo ID and certificate submissions to grant the verified tutor badge.
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
