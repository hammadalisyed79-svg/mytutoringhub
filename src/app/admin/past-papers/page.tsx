import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  PAST_PAPER_TYPES,
  PAST_PAPER_YEARS,
  getPastPaperFeePkr,
  papersForSubjectYear,
  pastPaperSubjects,
} from "@/lib/past-papers";
import { paperHasFile } from "@/lib/past-papers/availability";
import { PHASE1_SYLLABUS_CODE } from "@/lib/past-papers/constants";
import { documentTypeLabel } from "@/lib/past-papers/stored-filename";
import { AdminPastPaperFeeForm, AdminPastPaperUpload } from "@/components/AdminPastPapers";
import { AdminActionButton, AdminSyncPastPapersButton } from "@/components/AdminActions";

export const metadata = { title: "Past papers · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPastPapersPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; year?: string; code?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const feePkr = await getPastPaperFeePkr();
  const subjects = pastPaperSubjects();
  const subject = subjects.find((name) => name === sp.subject) || subjects[0] || "Mathematics";
  const year = PAST_PAPER_YEARS.includes(Number(sp.year) as (typeof PAST_PAPER_YEARS)[number])
    ? Number(sp.year)
    : PAST_PAPER_YEARS[0];
  const code = (sp.code || PHASE1_SYLLABUS_CODE).trim() || PHASE1_SYLLABUS_CODE;
  const listings = papersForSubjectYear(subject, year);
  const [files, uploaded, r2Papers] = await Promise.all([
    prisma.pastPaper.findMany({
      where: { catalogKey: { in: listings.map((row) => row.key) } },
    }),
    prisma.pastPaper.count({ where: { OR: [{ fileUrl: { not: null } }, { storageKey: { not: null } }] } }),
    prisma.pastPaper.findMany({
      where: {
        syllabusCode: { equals: code, mode: "insensitive" },
        OR: [{ storageProvider: "R2" }, { storageKey: { not: null }, fileUrl: null }],
      },
      orderBy: [{ year: "desc" }, { session: "asc" }, { componentCode: "asc" }, { documentType: "asc" }],
      take: 2000,
    }),
  ]);
  const fileMap = new Map(files.map((row) => [row.catalogKey, row]));

  return (
    <>
      <div>
        <h1 className="page-title">Past papers</h1>
        <p className="muted">
          Catalog covers uploaded R2 papers (not only synthetic year pairs). Upload a PDF or sync from R2 to
          make a paper downloadable. {uploaded} file{uploaded === 1 ? "" : "s"} in catalog.{" "}
          <Link href="/admin/past-papers/quality">Quality dashboard</Link>
          {" · "}
          Press <strong>Update past papers</strong> to refresh metadata from Cloudflare R2.{" "}
          <Link href="/admin/past-papers/import">Auto import / R2 sync</Link>
          {" · "}
          <Link href="/admin/past-papers/imports">Import history</Link>
        </p>
      </div>
      <section className="panel">
        <h2>Update from Cloudflare R2</h2>
        <AdminSyncPastPapersButton />
      </section>
      <section className="panel">
        <h2>Download fee</h2>
        <AdminPastPaperFeeForm feePkr={feePkr} />
      </section>
      <section className="panel">
        <h2>R2 library ({code})</h2>
        <p className="muted">
          Metadata for papers stored in Cloudflare R2. Hide or remove the catalog row — R2 objects are not deleted.
        </p>
        <form className="filters" method="get">
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="year" value={String(year)} />
          <label>
            Syllabus code
            <input name="code" defaultValue={code} placeholder="0620" />
          </label>
          <button className="btn" type="submit">
            Filter
          </button>
        </form>
        {r2Papers.length === 0 ? (
          <p className="muted">No R2-backed papers for {code}. Press Update past papers above, or use Import.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Paper</th>
                  <th>Storage</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {r2Papers.map((paper) => (
                  <tr key={paper.id}>
                    <td>
                      <strong>
                        {paper.year}
                        {paper.session ? ` · ${paper.session}` : ""}
                        {paper.componentCode ? ` · Paper ${paper.componentCode}` : ""}
                      </strong>
                      <div className="muted">
                        {documentTypeLabel(paper.documentType) || paper.paperType}
                        {paper.originalFilename ? ` · ${paper.originalFilename}` : ""}
                      </div>
                    </td>
                    <td>{paper.storageProvider || "R2"}</td>
                    <td>{paper.published && paper.isActive ? "Live" : "Hidden"}</td>
                    <td>
                      <AdminActionButton
                        action="past_paper_save"
                        extra={{ catalogKey: paper.catalogKey, published: !paper.published }}
                        label={paper.published ? "Hide" : "Publish"}
                      />
                      <AdminActionButton
                        action="past_paper_delete"
                        id={paper.id}
                        label="Remove"
                        confirm="Remove this catalog row? The R2 file will not be deleted."
                        danger
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Manual Blob uploads</h2>
        <form className="filters" method="get">
          <input type="hidden" name="code" value={code} />
          <label>
            Subject
            <select name="subject" defaultValue={subject}>
              {subjects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select name="year" defaultValue={String(year)}>
              {PAST_PAPER_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit">
            Show catalog
          </button>
        </form>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Paper</th>
                <th>Status</th>
                <th>File</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((row) => {
                const file = fileMap.get(row.key);
                return (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.board}</strong>
                      <div className="muted">
                        {row.year} · {row.paperType}
                      </div>
                    </td>
                    <td>{paperHasFile(file || {}) ? (file?.published ? "Live" : "Hidden") : "No file"}</td>
                    <td>
                      <AdminPastPaperUpload catalogKey={row.key} />
                    </td>
                    <td>
                      {file ? (
                        <>
                          <AdminActionButton
                            action="past_paper_save"
                            extra={{ catalogKey: row.key, published: !file.published }}
                            label={file.published ? "Hide" : "Publish"}
                          />
                          <AdminActionButton
                            action="past_paper_delete"
                            id={file.id}
                            label="Remove"
                            confirm="Remove this uploaded file?"
                            danger
                          />
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">Accepted types: {PAST_PAPER_TYPES.join(", ")}. PDF up to 12MB. Manual uploads stay on Blob.</p>
      </section>
    </>
  );
}
