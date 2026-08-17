import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Import job · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPastPaperImportJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: { items: { orderBy: { originalFilename: "asc" } } },
  });
  if (!job) notFound();

  return (
    <>
      <div>
        <p className="muted">
          <Link href="/admin/past-papers/imports">Import history</Link>
          {" · "}
          <Link href="/admin/past-papers/import">New import</Link>
        </p>
        <h1 className="page-title">Import job</h1>
        <p className="muted">
          {job.source.replace(/_/g, " ")} · {job.status} · {job.createdAt.toISOString().slice(0, 16).replace("T", " ")}
        </p>
      </div>
      <section className="panel">
        <p>
          Files {job.totalItems} · New {job.newCount} · Already exists {job.existsCount} · Imported {job.importedCount} ·
          Failed {job.failedCount} · Review {job.skippedCount}
        </p>
        {job.notes ? <p className="muted">{job.notes}</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Subject</th>
                <th>Year</th>
                <th>Type</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {job.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.originalFilename}</strong>
                    <div className="muted">{item.catalogKey || item.sourceUrl || ""}</div>
                  </td>
                  <td>
                    {item.subject || "—"}
                    <div className="muted">{item.syllabusCode || item.curriculumCode || ""}</div>
                  </td>
                  <td>
                    {item.year || "—"}
                    <div className="muted">
                      {item.session || ""} {item.componentCode ? `P${item.componentCode}` : ""}
                    </div>
                  </td>
                  <td>{item.documentType?.replace(/_/g, " ") || "—"}</td>
                  <td>{item.status.replace(/_/g, " ")}</td>
                  <td className="muted">{item.error || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
