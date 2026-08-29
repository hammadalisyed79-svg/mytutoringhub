import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  classifyPastPaperQuality,
  summarizeQualityClasses,
  type PaperQualityInput,
} from "@/lib/past-papers/quality-normalize";

export const metadata = { title: "Past paper quality · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPastPaperQualityPage() {
  await requireAdminPage();

  const total = await prisma.pastPaper.count();
  // Sample-based summary for page load speed; full dry-run via script.
  const sample = await prisma.pastPaper.findMany({
    take: 5000,
    orderBy: { updatedAt: "desc" },
    select: {
      session: true,
      paperType: true,
      documentType: true,
      storageKey: true,
      fileUrl: true,
      subject: true,
      board: true,
      syllabusCode: true,
      year: true,
    },
  });

  const summary = summarizeQualityClasses(sample as PaperQualityInput[]);

  const [otherCount, missingSession, withRaw, listingsMissingTaxonomy, activeListings] =
    await Promise.all([
      prisma.pastPaper.count({
        where: {
          OR: [{ documentType: "OTHER" }, { paperType: { equals: "Other", mode: "insensitive" } }],
        },
      }),
      prisma.pastPaper.count({
        where: { OR: [{ session: null }, { session: "" }] },
      }),
      prisma.pastPaper.count({ where: { sessionRaw: { not: null } } }),
      prisma.subjectProfile.count({
        where: {
          status: "ACTIVE",
          OR: [{ board: null }, { board: "" }, { syllabusCode: null }, { syllabusCode: "" }],
        },
      }),
      prisma.subjectProfile.count({ where: { status: "ACTIVE" } }),
    ]);

  const autoPreview = sample
    .map((row) => ({ row, q: classifyPastPaperQuality(row) }))
    .filter((x) => x.q.sessionNeedsWrite)
    .slice(0, 15);

  return (
    <>
      <div>
        <h1 className="page-title">Past paper quality</h1>
        <p className="muted">
          Classification of catalog metadata. Auto-fix is high-confidence only; originals preserved in{" "}
          <code>sessionRaw</code>. Run{" "}
          <code>npx tsx scripts/normalize-past-paper-sessions.ts</code> (dry-run) then{" "}
          <code>--apply</code> after reviewing counts.{" "}
          <Link href="/admin/past-papers">Back to past papers</Link>
        </p>
      </div>

      <section className="panel">
        <h2>Catalog totals</h2>
        <ul>
          <li>Total papers: <strong>{total.toLocaleString()}</strong></li>
          <li>Document type Other: <strong>{otherCount.toLocaleString()}</strong></li>
          <li>Missing session: <strong>{missingSession.toLocaleString()}</strong></li>
          <li>Already normalized (sessionRaw set): <strong>{withRaw.toLocaleString()}</strong></li>
          <li>
            ACTIVE listings missing board or syllabus:{" "}
            <strong>
              {listingsMissingTaxonomy}/{activeListings}
            </strong>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>Sample classification (latest {sample.length.toLocaleString()} rows)</h2>
        <ul>
          <li>CLEAN: <strong>{summary.clean}</strong></li>
          <li>AUTO-FIXABLE: <strong>{summary.autoFixable}</strong></li>
          <li>REVIEW REQUIRED: <strong>{summary.reviewRequired}</strong></li>
          <li>BROKEN: <strong>{summary.broken}</strong></li>
          <li>Missing file (in sample): <strong>{summary.missingFile}</strong></li>
          <li>Missing syllabus (in sample): <strong>{summary.missingSyllabus}</strong></li>
        </ul>
        {summary.sessionPreview.length > 0 && (
          <>
            <h3>Session auto-fix preview</h3>
            <ul>
              {summary.sessionPreview.map((row) => (
                <li key={`${row.from}-${row.to}`}>
                  <code>{row.from || "(empty)"}</code> → <code>{row.to}</code> ({row.count})
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Example auto-fixable rows</h2>
        {autoPreview.length === 0 && <p className="muted">No auto-fixable sessions in this sample.</p>}
        <ul>
          {autoPreview.map(({ row, q }) => (
            <li key={`${row.subject}-${row.session}-${q.sessionCanonical}`}>
              {row.board} · {row.subject} · <code>{row.session}</code> →{" "}
              <code>{q.sessionCanonical}</code>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
