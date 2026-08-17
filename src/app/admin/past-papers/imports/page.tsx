import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Import history · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPastPaperImportsPage() {
  await requireAdminPage();
  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <>
      <div>
        <p className="muted">
          <Link href="/admin/past-papers">Past papers</Link>
          {" · "}
          <Link href="/admin/past-papers/import">New import</Link>
        </p>
        <h1 className="page-title">Import history</h1>
        <p className="muted">Scan and import jobs. Open a job to see per-file results.</p>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Source</th>
                <th>Status</th>
                <th>Files</th>
                <th>New</th>
                <th>Imported</th>
                <th>Failed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">
                    No import jobs yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td>{job.source.replace(/_/g, " ")}</td>
                    <td>{job.status}</td>
                    <td>{job.totalItems}</td>
                    <td>{job.newCount}</td>
                    <td>{job.importedCount}</td>
                    <td>{job.failedCount}</td>
                    <td>
                      <Link href={`/admin/past-papers/imports/${job.id}`}>Open</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
