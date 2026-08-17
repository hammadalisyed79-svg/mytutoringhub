import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { AdminActionButton } from "@/components/AdminActions";

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
      <p className="muted">Approve photo ID and certificate submissions to grant the verified tutor badge.</p>
      {verifications.length === 0 && <p className="muted">No requests yet.</p>}
      <div className="results">
        {verifications.map((v) => (
          <article key={v.id} className="ad-row">
            <strong>
              <Link href={`/admin/users/${v.user.id}`}>{v.user.name}</Link> · {v.user.email} · {v.status}
            </strong>
            <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
              {v.docUrls}
            </p>
            {v.notes && <p>{v.notes}</p>}
            {v.adminNote && <p className="muted">Admin note: {v.adminNote}</p>}
            {v.status === "PENDING" && (
              <div className="admin-actions">
                <AdminActionButton action="verify_approve" id={v.id} label="Approve" />
                <AdminActionButton action="verify_reject" id={v.id} label="Reject" />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
