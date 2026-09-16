import { prisma } from "@/lib/prisma";
import { AdminVerificationQueueItem } from "@/components/AdminVerificationQueueItem";
import { AdminReportsBulkList } from "@/components/AdminBulk";
import { adminExportQuery } from "@/lib/admin-list";

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

  const reportRows = reports.map((r) => ({
    id: r.id,
    status: r.status,
    category: r.category,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter,
  }));

  return (
    <>
      <div className="page-hero panel" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Reports & safety</h1>
          <p className="muted">
            Resolve reports, suspend offenders, and review tutor verification documents.
          </p>
        </div>
        <a
          className="btn btn-secondary btn-sm"
          href={`/api/admin/export?${adminExportQuery({ status }, "reports")}`}
        >
          Export CSV
        </a>
      </div>

      <section className="panel">
        <h2>Verification queue ({verifications.length})</h2>
        {verifications.length === 0 && <p className="muted">No pending verification requests.</p>}
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
            />
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
        {reports.length > 0 ? <AdminReportsBulkList reports={reportRows} /> : null}
      </section>
    </>
  );
}
