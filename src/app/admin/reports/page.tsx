import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = sp.status || "OPEN";

  const [reports, verifications] = await Promise.all([
    prisma.report.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { reporter: { select: { id: true, name: true, email: true } } },
    }),
    prisma.verificationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Reports & safety</h1>
        <p className="muted">Resolve reports, suspend offenders, and review tutor verification documents.</p>
      </div>

      <section className="panel">
        <h2>Verification queue ({verifications.length})</h2>
        {verifications.length === 0 && <p className="muted">No pending verification requests.</p>}
        <div className="results">
          {verifications.map((v) => (
            <article key={v.id} className="ad-row">
              <strong>
                <Link href={`/admin/users/${v.user.id}`}>
                  {v.user.name} · {v.user.email}
                </Link>
              </strong>
              <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                {v.docUrls}
              </p>
              {v.notes && <p>{v.notes}</p>}
              <div className="admin-actions">
                <AdminActionButton
                  action="verify_approve"
                  id={v.id}
                  label="Approve"
                  confirm="Approve and set the verified tutor badge?"
                />
                <AdminActionButton
                  action="verify_reject"
                  id={v.id}
                  label="Reject"
                  promptKey="adminNote"
                  promptLabel="Optional rejection note"
                  danger
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <form className="filters" method="get">
        <label>
          Report status
          <select name="status" defaultValue={status}>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      <section className="panel">
        <h2>Reports</h2>
        {reports.length === 0 && <p className="muted">No reports in this view.</p>}
        <div className="results">
          {reports.map((r) => (
            <article key={r.id} className="ad-row">
              <strong>
                {r.status} · {r.targetType} · {r.targetId}
              </strong>
              <p>
                From{" "}
                <Link href={`/admin/users/${r.reporter.id}`}>
                  {r.reporter.name} ({r.reporter.email})
                </Link>
                : {r.reason}
              </p>
              <span className="muted">{r.createdAt.toLocaleString()}</span>
              {r.status === "OPEN" && (
                <div className="admin-actions">
                  <AdminActionButton action="report_resolve" id={r.id} label="Resolve" />
                  <AdminActionButton action="report_dismiss" id={r.id} label="Dismiss" />
                  <AdminActionButton
                    action="report_suspend"
                    id={r.id}
                    label="Suspend reported user"
                    confirm="Suspend the reported user and resolve this report?"
                    danger
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
