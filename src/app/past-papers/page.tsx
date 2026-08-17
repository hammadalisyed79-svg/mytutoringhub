import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { SubjectHubTabs } from "@/components/SubjectHubTabs";
import { PastPaperBuyButton } from "@/components/PastPaperBuyButton";
import {
  PAST_PAPER_YEARS,
  getPastPaperFeePkr,
  papersForSubjectYear,
  pastPaperBoards,
  pastPaperSubjects,
} from "@/lib/past-papers";
import { subjectCode } from "@/lib/markets";
import { slugify } from "@/lib/search-tutors";

export const metadata = {
  title: "Past papers",
  description:
    "Download recent 10 years of past papers by subject and board. Each paper is a one-time download.",
};

export const dynamic = "force-dynamic";

export default async function PastPapersPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string;
    year?: string;
    checkout?: string;
    key?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const currency = await getVisitorCurrency();
  const feePkr = await getPastPaperFeePkr();
  const feeLabel = feePkr === 0 ? "Free" : formatPlanPrice(feePkr, currency);
  const subjects = pastPaperSubjects();
  const subject = subjects.find((name) => name === sp.subject) || "";
  const year = PAST_PAPER_YEARS.includes(Number(sp.year) as (typeof PAST_PAPER_YEARS)[number])
    ? Number(sp.year)
    : PAST_PAPER_YEARS[0];

  const listings = subject ? papersForSubjectYear(subject, year) : [];
  const keys = listings.map((row) => row.key);
  const [files, purchases] = await Promise.all([
    keys.length
      ? prisma.pastPaper.findMany({
          where: { catalogKey: { in: keys }, published: true },
        })
      : Promise.resolve([]),
    session?.user
      ? prisma.pastPaperPurchase.findMany({
          where: { userId: session.user.id, status: "PAID" },
          select: { catalogKey: true },
        })
      : Promise.resolve([]),
  ]);
  const fileMap = new Map(files.map((row) => [row.catalogKey, row]));
  const owned = new Set(purchases.map((row) => row.catalogKey));
  const boards = subject ? pastPaperBoards(subject) : [];

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Past papers</h1>
        <p className="section-lead">
          Recent 10 years (2016–2025) across school boards and exam prep. Each download is{" "}
          <strong>{feeLabel}</strong>
          {feePkr === 0 ? " for signed-in users" : " — set by admin, paid once per paper"}.
        </p>
        <SubjectHubTabs active="papers" />

        {sp.checkout === "success" && (
          <p className="success panel">
            Payment received.{" "}
            {sp.key ? (
              <a href={`/api/past-papers/download?key=${encodeURIComponent(sp.key)}`}>Download your paper</a>
            ) : (
              "Your paper is unlocked."
            )}
          </p>
        )}
        {sp.checkout === "cancel" && <p className="panel">Checkout cancelled. No charge was made.</p>}
        {sp.checkout === "error" && (
          <p className="panel form-error">Payment could not be confirmed. Try again or contact support.</p>
        )}

        {!subject ? (
          <>
            <p className="muted">Choose a subject to open 10 years of question papers and marking schemes.</p>
            <div className="subject-directory" style={{ marginTop: "1rem" }}>
              {subjects.map((name) => (
                <Link
                  key={name}
                  href={`/past-papers?subject=${encodeURIComponent(name)}`}
                  className="subject-tile"
                >
                  <span className="subject-code">{subjectCode(name)}</span>
                  <span className="subject-tile-name">{name}</span>
                  <span className="subject-tile-rate">2016–2025</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              <Link href="/past-papers">All subjects</Link>
              {" · "}
              {subject} · {boards.length} board{boards.length === 1 ? "" : "s"} · {year}
            </p>
            <nav className="year-tabs" aria-label="Exam year">
              {PAST_PAPER_YEARS.map((y) => (
                <Link
                  key={y}
                  href={`/past-papers?subject=${encodeURIComponent(subject)}&year=${y}`}
                  className={`page-tab ${y === year ? "is-active" : ""}`}
                >
                  {y}
                </Link>
              ))}
            </nav>

            {boards.map((board) => {
              const rows = listings.filter((row) => row.board === board);
              if (!rows.length) return null;
              return (
                <section key={board} className="paper-board panel">
                  <h2>{board}</h2>
                  <div className="paper-rows">
                    {rows.map((row) => {
                      const file = fileMap.get(row.key);
                      const available = Boolean(file?.fileUrl);
                      return (
                        <article key={row.key} className="paper-row">
                          <div>
                            <h3>{row.paperType}</h3>
                            <p className="muted">
                              {row.subject} · {row.year}
                            </p>
                          </div>
                          <PastPaperBuyButton
                            catalogKey={row.key}
                            available={available}
                            owned={owned.has(row.key) || session?.user?.role === "ADMIN"}
                            feeLabel={feeLabel}
                            signedIn={Boolean(session?.user)}
                          />
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}

        <p className="muted" style={{ marginTop: "2rem" }}>
          Files are provided by My Tutoring Hub for revision. Exam boards own the original papers.
          Find a tutor for {subject || "this subject"} on{" "}
          <Link href={subject ? `/s/${slugify(subject)}` : "/search"}>tutor search</Link>.
        </p>
      </div>
    </div>
  );
}
