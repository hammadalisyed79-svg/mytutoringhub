import Link from "next/link";
import { AdminActionButton } from "@/components/AdminActions";
import { AdminVerificationDocs } from "@/components/AdminVerificationDocs";

export function AdminVerificationQueueItem({
  id,
  status,
  createdAt,
  adminNote,
  user,
  docUrls,
  notes,
  showActions = status === "PENDING",
  priorityReview = false,
}: {
  id: string;
  status: string;
  createdAt: Date;
  adminNote?: string | null;
  user: { id: string; name: string; email: string };
  docUrls: string;
  notes?: string | null;
  showActions?: boolean;
  priorityReview?: boolean;
}) {
  return (
    <article className="admin-verify-queue-card">
      <header className="admin-verify-queue-head">
        <div>
          <p className="admin-verify-queue-kicker">
            {priorityReview && status === "PENDING" ? (
              <>
                <strong>Priority queue</strong>
                <span> · </span>
              </>
            ) : null}
            {status === "PENDING" ? "Awaiting review" : status}
            <span> · </span>
            {createdAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <h3>
            <Link href={`/admin/users/${user.id}`}>{user.name}</Link>
          </h3>
          <p className="muted admin-verify-queue-email">{user.email}</p>
        </div>
        <Link href={`/admin/users/${user.id}`} className="btn btn-secondary btn-sm">
          View profile
        </Link>
      </header>

      <AdminVerificationDocs docUrls={docUrls} notes={notes} />

      {adminNote ? (
        <p className="admin-verify-admin-note">
          <strong>Admin note:</strong> {adminNote}
        </p>
      ) : null}

      {showActions ? (
        <div className="admin-actions">
          <AdminActionButton
            action="verify_approve"
            id={id}
            label="Approve"
            confirm="Approve and set the verified tutor badge?"
          />
          <AdminActionButton
            action="verify_reject"
            id={id}
            label="Reject"
            promptKey="adminNote"
            promptLabel="Optional rejection note"
            danger
          />
        </div>
      ) : null}
    </article>
  );
}
