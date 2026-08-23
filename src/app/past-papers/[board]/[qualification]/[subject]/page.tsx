import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { SubjectHubTabs } from "@/components/SubjectHubTabs";
import { PastPaperTutorCta } from "@/components/PastPaperTutorCta";
import { PastPaperBuyButton } from "@/components/PastPaperBuyButton";
import { getPastPaperFeePkr } from "@/lib/past-papers";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";
import { resolveSeoCurriculum } from "@/lib/past-papers/browse";
import { DOCUMENT_TYPE_LABELS } from "@/lib/past-papers/constants";
import { documentTypeShortLabel, groupPapersByYearSessionComponent } from "@/lib/past-papers/group-papers";
import { listPublicPastPapers } from "@/lib/past-papers/public-search";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/search-tutors";
import { JsonLd } from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  pageMetadata,
  pastPaperLearningResourceJsonLd,
  truncateDescription,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ board: string; qualification: string; subject: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { board, qualification, subject } = await params;
  const resolved = resolveSeoCurriculum(board, qualification, subject);
  const entry = resolved.entry;
  const titleSubject = entry?.subject || subject.replace(/-/g, " ");
  const titleBoard = entry?.board || board.replace(/-/g, " ");
  const titleLevel = entry?.level || qualification.replace(/-/g, " ");
  const code = resolved.syllabusCode || entry?.code || "";
  const title = `${titleSubject}${code ? ` ${code}` : ""} ${titleLevel} Past Papers`;
  const description = truncateDescription(
    `Download ${titleBoard} ${titleLevel} ${titleSubject}${code ? ` ${code}` : ""} past papers and marking schemes by year, session and paper. Find ${titleSubject} tutors for additional support.`,
  );
  return pageMetadata({
    title,
    description,
    path: `/past-papers/${board}/${qualification}/${subject}`,
  });
}

export default async function PastPaperSeoPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<{ year?: string; session?: string; paper?: string; documentType?: string }> }) {
  const { board, qualification, subject } = await params;
  const sp = await searchParams;
  const resolved = resolveSeoCurriculum(board, qualification, subject);
  if (!resolved.entry && !resolved.syllabusCode) notFound();
  const entry = resolved.entry;
  const session = await auth();
  const currency = await getVisitorCurrency();
  const feePkr = await getPastPaperFeePkr();
  const feeLabel = feePkr === 0 ? "Free" : formatPlanPrice(feePkr, currency);
  const code = resolved.syllabusCode || "";
  let papers = await listPublicPastPapers({
    subject: entry?.subject,
    board: entry?.board || (board === "cambridge" ? "Cambridge" : undefined),
    qualification: entry?.level,
    code: code || undefined,
    year: sp.year ? Number(sp.year) : undefined,
    session: sp.session || undefined,
    paper: sp.paper || undefined,
    documentType: sp.documentType || undefined,
  });
  if (papers.length < 5 && entry && !sp.documentType && !sp.paper) {
    const extra = await prisma.pastPaper.findMany({
      where: {
        ...publicAvailabilityWhere(),
        subject: entry.subject,
        board: { contains: "Cambridge", mode: "insensitive" },
        ...(code ? { syllabusCode: code } : {}),
      },
      take: 2000,
      orderBy: [{ year: "desc" }, { componentCode: "asc" }],
    });
    const seen = new Set(papers.map((row) => row.id));
    papers = [...papers, ...extra.filter((row) => !seen.has(row.id))];
  }
  const purchases = session?.user
    ? await prisma.pastPaperPurchase.findMany({
        where: { userId: session.user.id, status: "PAID" },
        select: { catalogKey: true },
      })
    : [];
  const owned = new Set(purchases.map((row) => row.catalogKey));
  const titleSubject = entry?.subject || subject.replace(/-/g, " ");
  const titleLevel = entry?.level || qualification.replace(/-/g, " ");
  const groups = groupPapersByYearSessionComponent(papers);
  const years = [...new Set(papers.map((row) => row.year))].sort((a, b) => b - a);

  const titleBoard = entry?.board || board.replace(/-/g, " ");
  const paperPath = `/past-papers/${board}/${qualification}/${subject}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Past papers", path: "/past-papers" },
              { name: `${titleSubject} ${titleLevel}`, path: paperPath },
            ]),
            pastPaperLearningResourceJsonLd({
              name: `${titleSubject}${code ? ` ${code}` : ""} ${titleLevel} past papers`,
              description: `${titleBoard} ${titleSubject} ${titleLevel} examination papers and mark schemes.`,
              path: paperPath,
              board: titleBoard,
              level: titleLevel,
            }),
          ],
        }}
      />
    <div className="page">
      <div className="container">
        <h1 className="page-title">
          {titleSubject}
          {code ? ` ${code}` : ""} {titleLevel} Past Papers
        </h1>
        <p className="section-lead">
          {/cambridge/i.test(entry?.board || board) ? "Cambridge International" : entry?.board || "Board"} ·{" "}
          {titleLevel}. Files on My Tutoring Hub are {feeLabel} per download.
        </p>
        <SubjectHubTabs active="papers" />
        <PastPaperTutorCta subject={titleSubject} />
        <p className="paper-crumb muted">
          <Link href="/subjects">Subjects</Link>
          {" · "}
          <Link href="/past-papers">Past papers</Link>
          {entry ? (
            <>
              {" · "}
              <Link href={`/past-papers?country=${encodeURIComponent(entry.country)}`}>{entry.country}</Link>
              {" · "}
              {entry.board}
            </>
          ) : null}
          {" · "}
          <Link href={`/search?subject=${encodeURIComponent(titleSubject)}`}>Find tutors</Link>
        </p>

        <form className="panel filters filters-wide" method="get">
          <label>
            Year
            <select name="year" defaultValue={sp.year || ""}>
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            Session
            <select name="session" defaultValue={sp.session || ""}>
              <option value="">Any</option>
              {["Feb/Mar", "May/Jun", "Oct/Nov"].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Paper / component
            <input name="paper" defaultValue={sp.paper || ""} placeholder="Paper number" aria-label="Paper / component" />
          </label>
          <label>
            Document type
            <select name="documentType" defaultValue={sp.documentType || ""}>
              <option value="">Any</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit">
            Filter
          </button>
        </form>

        {papers.length === 0 ? (
          <section className="paper-board panel">
            <h2>Papers</h2>
            <p className="muted">Coming soon — no files have been published for this subject yet.</p>
          </section>
        ) : (
          groups.map((yearGroup) => (
            <section key={yearGroup.year} className="paper-board panel">
              <h2>{yearGroup.year}</h2>
              {yearGroup.sessions.map((sessionGroup) => (
                <div key={`${yearGroup.year}-${sessionGroup.session}`} className="paper-session">
                  <h3>{sessionGroup.session}</h3>
                  {sessionGroup.components.map((component) => (
                    <div key={`${yearGroup.year}-${sessionGroup.session}-${component.componentCode}`}>
                      <p className="paper-component-label">
                        {component.componentCode === "other"
                          ? "Supporting documents"
                          : `Paper ${component.componentCode}`}
                      </p>
                      <div className="paper-rows">
                        {component.papers.map((paper) => (
                          <article key={paper.id} className="paper-row">
                            <div>
                              <h3>{documentTypeShortLabel(paper.documentType, paper.paperType)}</h3>
                              <p className="muted">
                                {paper.session || sessionGroup.session}
                                {code ? ` · ${code}` : paper.syllabusCode ? ` · ${paper.syllabusCode}` : ""}
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
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))
        )}
        <p className="muted" style={{ marginTop: "2rem" }}>
          Exam boards own the original papers. Find a {titleSubject} tutor on{" "}
          <Link href={`/s/${slugify(titleSubject)}`}>tutor search</Link>.
        </p>
      </div>
    </div>
    </>
  );
}
