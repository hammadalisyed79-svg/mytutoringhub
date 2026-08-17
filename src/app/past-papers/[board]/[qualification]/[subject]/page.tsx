import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { formatPlanPrice } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { SubjectHubTabs } from "@/components/SubjectHubTabs";
import { PastPaperBuyButton } from "@/components/PastPaperBuyButton";
import { getPastPaperFeePkr } from "@/lib/past-papers";
import { resolveSeoCurriculum } from "@/lib/past-papers/browse";
import { searchPublicPastPapers } from "@/lib/past-papers/public-search";
import { documentTypeLabel } from "@/lib/past-papers/stored-filename";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/search-tutors";

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
  const title = `${titleSubject}${code ? ` ${code}` : ""} ${titleLevel} past papers`;
  const description = `Download ${titleSubject} ${titleLevel} past papers for ${titleBoard} on My Tutoring Hub. Question papers, mark schemes, and related documents.`;
  const canonical = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com"}/past-papers/${board}/${qualification}/${subject}`;
  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical },
  };
}

export default async function PastPaperSeoPage({ params }: Params) {
  const { board, qualification, subject } = await params;
  const resolved = resolveSeoCurriculum(board, qualification, subject);
  if (!resolved.entry && !resolved.syllabusCode) notFound();
  const entry = resolved.entry;
  const session = await auth();
  const currency = await getVisitorCurrency();
  const feePkr = await getPastPaperFeePkr();
  const feeLabel = feePkr === 0 ? "Free" : formatPlanPrice(feePkr, currency);
  const { papers } = await searchPublicPastPapers(
    {
      subject: entry?.subject,
      board: entry?.board || (board === "cambridge" ? "Cambridge" : undefined),
      qualification: entry?.level,
      code: resolved.syllabusCode || undefined,
    },
    1,
  );
  const extra =
    papers.length < 5 && entry
      ? await prisma.pastPaper.findMany({
          where: {
            published: true,
            isActive: true,
            fileUrl: { not: null },
            subject: entry.subject,
            board: { contains: "Cambridge", mode: "insensitive" },
          },
          take: 40,
          orderBy: [{ year: "desc" }, { componentCode: "asc" }],
        })
      : [];
  const seen = new Set(papers.map((row) => row.id));
  const all = [...papers, ...extra.filter((row) => !seen.has(row.id))];
  const purchases = session?.user
    ? await prisma.pastPaperPurchase.findMany({
        where: { userId: session.user.id, status: "PAID" },
        select: { catalogKey: true },
      })
    : [];
  const owned = new Set(purchases.map((row) => row.catalogKey));
  const titleSubject = entry?.subject || subject.replace(/-/g, " ");
  const titleLevel = entry?.level || qualification.replace(/-/g, " ");
  const code = resolved.syllabusCode || "";

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">
          {titleSubject}
          {code ? ` ${code}` : ""} {titleLevel} past papers
        </h1>
        <p className="section-lead">
          {entry?.board || "Cambridge"} · {titleLevel}. Files on My Tutoring Hub are {feeLabel} per download.
        </p>
        <SubjectHubTabs active="papers" />
        <p className="paper-crumb muted">
          <Link href="/past-papers">Past papers</Link>
          {entry ? (
            <>
              {" → "}
              <Link href={`/past-papers?country=${encodeURIComponent(entry.country)}`}>{entry.country}</Link>
              {" → "}
              {entry.board}
            </>
          ) : null}
        </p>
        <section className="paper-board panel">
          <h2>Papers</h2>
          {all.length === 0 ? (
            <p className="muted">Coming soon — no files have been uploaded for this subject yet.</p>
          ) : (
            <div className="paper-rows">
              {all.map((paper) => (
                <article key={paper.id} className="paper-row">
                  <div>
                    <h3>
                      {paper.year} · {documentTypeLabel(paper.documentType) || paper.paperType}
                      {paper.componentCode ? ` · Paper ${paper.componentCode}` : ""}
                    </h3>
                    <p className="muted">
                      {paper.session || ""} {paper.syllabusCode || code}
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
          )}
        </section>
        <p className="muted" style={{ marginTop: "2rem" }}>
          Exam boards own the original papers. Find a {titleSubject} tutor on{" "}
          <Link href={`/s/${slugify(titleSubject)}`}>tutor search</Link>.
        </p>
      </div>
    </div>
  );
}
