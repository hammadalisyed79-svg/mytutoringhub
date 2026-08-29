import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { curriculumCountries } from "@/lib/curriculum";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";
import { buildPastPaperFilterTree } from "@/lib/past-papers/browse";
import { PastPaperSearchForm } from "@/components/PastPaperSearchForm";

export async function HomePastPapersShowcase({ pinnedCountry }: { pinnedCountry?: string }) {
  const countries = curriculumCountries(pinnedCountry);
  const [pastPaperCount, boardCountRows] = await Promise.all([
    prisma.pastPaper.count({ where: publicAvailabilityWhere() }),
    prisma.pastPaper.groupBy({
      by: ["board", "country"],
      where: publicAvailabilityWhere(),
      _count: { _all: true },
    }),
  ]);

  if (pastPaperCount <= 0) return null;

  const boardCountsByCountry = new Map<string, Map<string, number>>();
  for (const row of boardCountRows) {
    if (!row.country) continue;
    const bucket = boardCountsByCountry.get(row.country) || new Map<string, number>();
    bucket.set(row.board, (bucket.get(row.board) || 0) + row._count._all);
    boardCountsByCountry.set(row.country, bucket);
  }

  const pastPaperFilterTree = buildPastPaperFilterTree(countries, boardCountsByCountry);
  const pastPaperLabel = pastPaperCount.toLocaleString();

  return (
    <section className="section home-past-papers" aria-labelledby="home-past-papers-title">
      <div className="container home-past-papers-inner">
        <div className="home-past-papers-copy">
          <p className="eyebrow">Exam preparation</p>
          <h2 id="home-past-papers-title">
            {pastPaperLabel} past papers. And tutors when you need help.
          </h2>
          <p className="section-lead">
            Filter by board, qualification, subject, year, and session — then find a tutor who
            teaches that exam track.
          </p>
          <div className="hero-ctas">
            <Link href="/past-papers" className="btn">
              Browse Past Papers
            </Link>
            <Link href="/search" className="btn btn-secondary">
              Find an exam tutor
            </Link>
          </div>
        </div>
        <div className="home-past-papers-preview">
          <p className="home-pp-preview-label" id="home-pp-filter-title">
            Filter past papers
          </p>
          <PastPaperSearchForm
            tree={pastPaperFilterTree}
            pinnedCountry={pinnedCountry}
            action="/past-papers"
            compact
            initial={{}}
          />
        </div>
      </div>
    </section>
  );
}

export function HomePastPapersFallback() {
  return (
    <section className="section home-past-papers" aria-busy="true" aria-label="Loading past papers">
      <div className="container home-past-papers-inner">
        <div className="home-past-papers-copy">
          <p className="eyebrow">Exam preparation</p>
          <h2>Past papers catalog</h2>
          <p className="section-lead">Loading filters…</p>
        </div>
      </div>
    </section>
  );
}
