import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  PAST_PAPER_TYPES,
  PAST_PAPER_YEARS,
  getPastPaperFeePkr,
  papersForSubjectYear,
  pastPaperSubjects,
} from "@/lib/past-papers";
import { AdminPastPaperFeeForm, AdminPastPaperUpload } from "@/components/AdminPastPapers";
import { AdminActionButton } from "@/components/AdminActions";

export const metadata = { title: "Past papers · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPastPapersPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; year?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const feePkr = await getPastPaperFeePkr();
  const subjects = pastPaperSubjects();
  const subject = subjects.find((name) => name === sp.subject) || subjects[0] || "Mathematics";
  const year = PAST_PAPER_YEARS.includes(Number(sp.year) as (typeof PAST_PAPER_YEARS)[number])
    ? Number(sp.year)
    : PAST_PAPER_YEARS[0];
  const listings = papersForSubjectYear(subject, year);
  const files = await prisma.pastPaper.findMany({
    where: { catalogKey: { in: listings.map((row) => row.key) } },
  });
  const fileMap = new Map(files.map((row) => [row.catalogKey, row]));
  const uploaded = await prisma.pastPaper.count({ where: { fileUrl: { not: null } } });

  return (
    <>
      <div>
        <h1 className="page-title">Past papers</h1>
        <p className="muted">
          Catalog covers 2016–2025 for every subject and board. Upload a PDF to make a paper
          downloadable. {uploaded} file{uploaded === 1 ? "" : "s"} uploaded.
        </p>
      </div>
      <section className="panel">
        <h2>Download fee</h2>
        <AdminPastPaperFeeForm feePkr={feePkr} />
      </section>
      <section className="panel">
        <h2>Upload papers</h2>
        <form className="filters" method="get">
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
                    <td>{file?.fileUrl ? (file.published ? "Live" : "Hidden") : "No file"}</td>
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
        <p className="muted">Accepted types: {PAST_PAPER_TYPES.join(", ")}. PDF up to 12MB.</p>
      </section>
    </>
  );
}
