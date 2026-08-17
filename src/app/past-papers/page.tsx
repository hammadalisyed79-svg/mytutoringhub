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
import { curriculumCountries } from "@/lib/curriculum";
import {
  curriculumBoardsForCountry,
  curriculumLevelsForBoard,
  curriculumSubjectsFor,
  PAST_PAPER_PAGE_SIZE,
  seoBoardSlug,
  subjectSeoSlug,
  uniqueCurriculumBoards,
  uniqueCurriculumLevels,
  uniqueCurriculumSubjects,
} from "@/lib/past-papers/browse";
import { searchPublicPastPapers } from "@/lib/past-papers/public-search";
import { documentTypeLabel } from "@/lib/past-papers/stored-filename";
import { slugify } from "@/lib/search-tutors";

export const metadata = {
  title: "Past papers",
  description:
    "Browse My Tutoring Hub past papers by country, board, qualification, subject, year and session.",
};

export const dynamic = "force-dynamic";

function hrefWith(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    sp.set(key, String(value));
  }
  const q = sp.toString();
  return q ? `/past-papers?${q}` : "/past-papers";
}

export default async function PastPapersPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string;
    year?: string;
    country?: string;
    board?: string;
    level?: string;
    session?: string;
    q?: string;
    code?: string;
    paper?: string;
    page?: string;
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
  const countries = curriculumCountries();
  const country = countries.find((name) => name === sp.country) || "";
  const boardsForCountry = country ? curriculumBoardsForCountry(country) : [];
  const board = boardsForCountry.find((name) => name === sp.board) || "";
  const levels = country && board ? curriculumLevelsForBoard(country, board) : [];
  const level = levels.find((name) => name === sp.level) || "";
  const curriculumSubjects =
    country && board && level ? curriculumSubjectsFor(country, board, level) : [];
  const subject =
    subjects.find((name) => name === sp.subject) ||
    curriculumSubjects.find((row) => row.subject === sp.subject)?.subject ||
    "";
  const year = PAST_PAPER_YEARS.includes(Number(sp.year) as (typeof PAST_PAPER_YEARS)[number])
    ? Number(sp.year)
    : sp.year
      ? Number(sp.year)
      : 0;
  const page = Math.max(1, Number(sp.page) || 1);
  const searching = Boolean(sp.q || sp.code || sp.paper || (sp.board && !country));

  const listings = subject && year ? papersForSubjectYear(subject, year) : [];
  const keys = listings.map((row) => row.key);
  const [files, purchases, searchResult, importedForSubject] = await Promise.all([
    keys.length
      ? prisma.pastPaper.findMany({
          where: { catalogKey: { in: keys }, published: true, isActive: true },
        })
      : Promise.resolve([]),
    session?.user
      ? prisma.pastPaperPurchase.findMany({
          where: { userId: session.user.id, status: "PAID" },
          select: { catalogKey: true },
        })
      : Promise.resolve([]),
    searching || (country && board && level && subject)
      ? searchPublicPastPapers(
          {
            q: sp.q,
            code: sp.code,
            paper: sp.paper,
            subject: subject || undefined,
            board: board || sp.board,
            qualification: level || undefined,
            country: country || undefined,
            year: year || undefined,
            session: sp.session,
          },
          page,
        )
      : Promise.resolve(null),
    subject
      ? prisma.pastPaper.findMany({
          where: {
            subject,
            published: true,
            isActive: true,
            fileUrl: { not: null },
            ...(year ? { year } : {}),
            ...(sp.session ? { session: sp.session } : {}),
            ...(board ? { board } : {}),
          },
          orderBy: [{ year: "desc" }, { session: "asc" }, { componentCode: "asc" }],
          take: 80,
        })
      : Promise.resolve([]),
  ]);
  const fileMap = new Map(files.map((row) => [row.catalogKey, row]));
  const owned = new Set(purchases.map((row) => row.catalogKey));
  const boards = subject ? pastPaperBoards(subject) : [];
  const pages = searchResult ? Math.max(1, Math.ceil(searchResult.total / PAST_PAPER_PAGE_SIZE)) : 1;

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Past papers</h1>
        <p className="section-lead">
          Browse by country, board, qualification, subject, year and session. Each download is{" "}
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

        <form className="panel filters filters-wide" method="get">
          <label>
            Search
            <input name="q" defaultValue={sp.q || ""} placeholder="Chemistry, 0620, paper 42" />
          </label>
          <label>
            Subject
            <select name="subject" defaultValue={subject}>
              <option value="">Any</option>
              {uniqueCurriculumSubjects(board || undefined, level || undefined).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Code
            <input name="code" defaultValue={sp.code || ""} placeholder="0620" />
          </label>
          <label>
            Board
            <select name="board" defaultValue={board || sp.board || ""}>
              <option value="">Any</option>
              {uniqueCurriculumBoards().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qualification
            <select name="level" defaultValue={level}>
              <option value="">Any</option>
              {uniqueCurriculumLevels(board || undefined).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select name="year" defaultValue={year ? String(year) : ""}>
              <option value="">Any</option>
              {PAST_PAPER_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            Paper code
            <input name="paper" defaultValue={sp.paper || ""} placeholder="42" />
          </label>
          <button className="btn" type="submit">
            Search
          </button>
        </form>

        <p className="paper-crumb muted">
          <Link href="/past-papers">All countries</Link>
          {country ? (
            <>
              {" → "}
              <Link href={hrefWith({ country })}>{country}</Link>
            </>
          ) : null}
          {board ? (
            <>
              {" → "}
              <Link href={hrefWith({ country, board })}>{board}</Link>
            </>
          ) : null}
          {level ? (
            <>
              {" → "}
              <Link href={hrefWith({ country, board, level })}>{level}</Link>
            </>
          ) : null}
          {subject ? (
            <>
              {" → "}
              <Link href={hrefWith({ country, board, level, subject })}>{subject}</Link>
            </>
          ) : null}
          {year ? (
            <>
              {" → "}
              <Link href={hrefWith({ country, board, level, subject, year })}>{year}</Link>
            </>
          ) : null}
          {sp.session ? <>{" → "}{sp.session}</> : null}
        </p>

        {searchResult && (sp.q || sp.code || sp.paper) ? (
          <section className="panel">
            <h2>Search results</h2>
            <p className="muted">{searchResult.total} paper{searchResult.total === 1 ? "" : "s"}</p>
            <div className="paper-rows">
              {searchResult.papers.length === 0 ? (
                <p className="muted">No uploaded papers matched. Catalog listings without files stay “Coming soon”.</p>
              ) : (
                searchResult.papers.map((paper) => (
                  <article key={paper.id} className="paper-row">
                    <div>
                      <h3>
                        {paper.subject} · {documentTypeLabel(paper.documentType) || paper.paperType}
                      </h3>
                      <p className="muted">
                        {paper.board} · {paper.year}
                        {paper.session ? ` · ${paper.session}` : ""}
                        {paper.componentCode ? ` · Paper ${paper.componentCode}` : ""}
                        {paper.syllabusCode ? ` · ${paper.syllabusCode}` : ""}
                      </p>
                    </div>
                    <PastPaperBuyButton
                      catalogKey={paper.catalogKey}
                      available
                      owned={owned.has(paper.catalogKey) || session?.user?.role === "ADMIN"}
                      feeLabel={feeLabel}
                      signedIn={Boolean(session?.user)}
                    />
                  </article>
                ))
              )}
            </div>
            {pages > 1 ? (
              <nav className="year-tabs" aria-label="Pages">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={hrefWith({ ...sp, page: n })}
                    className={`page-tab ${n === page ? "is-active" : ""}`}
                  >
                    {n}
                  </Link>
                ))}
              </nav>
            ) : null}
          </section>
        ) : !country && !subject ? (
          <div className="subject-directory" style={{ marginTop: "1rem" }}>
            {countries.map((name) => (
              <Link key={name} href={hrefWith({ country: name })} className="subject-tile">
                <span className="subject-tile-name">{name}</span>
                <span className="subject-tile-rate">Country</span>
              </Link>
            ))}
          </div>
        ) : country && !board ? (
          <div className="subject-directory" style={{ marginTop: "1rem" }}>
            {boardsForCountry.map((name) => (
              <Link key={name} href={hrefWith({ country, board: name })} className="subject-tile">
                <span className="subject-tile-name">{name}</span>
                <span className="subject-tile-rate">Board</span>
              </Link>
            ))}
          </div>
        ) : country && board && !level ? (
          <div className="subject-directory" style={{ marginTop: "1rem" }}>
            {levels.map((name) => (
              <Link key={name} href={hrefWith({ country, board, level: name })} className="subject-tile">
                <span className="subject-tile-name">{name}</span>
                <span className="subject-tile-rate">Qualification</span>
              </Link>
            ))}
          </div>
        ) : country && board && level && !subject ? (
          <div className="subject-directory" style={{ marginTop: "1rem" }}>
            {curriculumSubjects.map((row) => (
              <Link
                key={row.code}
                href={`/past-papers/${seoBoardSlug(row.board)}/${slugify(row.level)}/${subjectSeoSlug(row)}`}
                className="subject-tile"
              >
                <span className="subject-code">{row.code}</span>
                <span className="subject-tile-name">{row.subject}</span>
                <span className="subject-tile-rate">Subject</span>
              </Link>
            ))}
          </div>
        ) : (
          <>
            {subject ? (
              <nav className="year-tabs" aria-label="Exam year">
                {PAST_PAPER_YEARS.map((y) => (
                  <Link
                    key={y}
                    href={hrefWith({ country, board, level, subject, year: y })}
                    className={`page-tab ${y === year ? "is-active" : ""}`}
                  >
                    {y}
                  </Link>
                ))}
              </nav>
            ) : null}
            {year ? (
              <nav className="year-tabs" aria-label="Exam session">
                {["Feb/Mar", "May/Jun", "Oct/Nov"].map((name) => (
                  <Link
                    key={name}
                    href={hrefWith({ country, board, level, subject, year, session: name })}
                    className={`page-tab ${sp.session === name ? "is-active" : ""}`}
                  >
                    {name}
                  </Link>
                ))}
              </nav>
            ) : null}

            {importedForSubject.length > 0 ? (
              <section className="paper-board panel">
                <h2>Available papers</h2>
                <div className="paper-rows">
                  {importedForSubject.map((paper) => (
                    <article key={paper.id} className="paper-row">
                      <div>
                        <h3>
                          {documentTypeLabel(paper.documentType) || paper.paperType}
                          {paper.componentCode ? ` · Paper ${paper.componentCode}` : ""}
                        </h3>
                        <p className="muted">
                          {paper.board} · {paper.year}
                          {paper.session ? ` · ${paper.session}` : ""}
                          {paper.syllabusCode ? ` · ${paper.syllabusCode}` : ""}
                        </p>
                      </div>
                      <PastPaperBuyButton
                        catalogKey={paper.catalogKey}
                        available
                        owned={owned.has(paper.catalogKey) || session?.user?.role === "ADMIN"}
                        feeLabel={feeLabel}
                        signedIn={Boolean(session?.user)}
                      />
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {listings.length > 0
              ? boards.map((boardName) => {
                  const rows = listings.filter((row) => row.board === boardName);
                  if (!rows.length) return null;
                  return (
                    <section key={boardName} className="paper-board panel">
                      <h2>{boardName} catalog</h2>
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
                })
              : null}
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
