import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SUBJECT_CATEGORIES } from "@/lib/marketing";
import { CurriculumBrowser } from "@/components/CurriculumBrowser";
import { averageRateForSubject, slugify } from "@/lib/search-tutors";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { subjectCode } from "@/lib/markets";
import { SubjectHubTabs } from "@/components/SubjectHubTabs";
import { CURRICULUM } from "@/lib/curriculum";

export const metadata = {
  title: "Subjects",
  description:
    "Browse 1,200+ curriculum subject codes across 15 countries, including Pakistan boards, Cambridge, IB, and CBSE.",
};

function groupSubjectsByLetter<T extends { name: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const letter = item.name.slice(0, 1).toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; q?: string; tab?: string }>;
}) {
  const currency = await getVisitorCurrency();
  const { country, q, tab } = await searchParams;
  const showCodes = tab === "codes";
  const dbSubjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  const averages = await Promise.all(
    dbSubjects.map(async (s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug || slugify(s.name),
      avg: await averageRateForSubject(s.name),
    })),
  );

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Subjects</h1>
        <p className="section-lead">
          School boards, exams, languages, and university subjects across 15 countries — including
          Pakistan. Each listing uses a subject code such as FBISE-HSSC-MATH or IB-DP-PHY.
        </p>
        <SubjectHubTabs active={showCodes ? "codes" : "directory"} />

        {showCodes ? (
          <section style={{ marginBottom: "2.5rem" }}>
            <h2>Curriculum subject codes</h2>
            <p className="muted">
              {CURRICULUM.length.toLocaleString()} subject codes from national boards, Cambridge, IB,
              and other curricula. Pick a country, then open a code to find tutors.
            </p>
            <CurriculumBrowser country={country} query={q} />
          </section>
        ) : (
          <>
        <div className="subject-cats">
          {SUBJECT_CATEGORIES.map((cat) => (
            <div key={cat.title} className="panel">
              <h2 style={{ marginTop: 0, fontSize: "1.35rem" }}>{cat.title}</h2>
              <ul className="subject-cat-list">
                {cat.items.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/s/${slugify(item.slug)}`}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <section className="all-subjects">
          <h2>All subjects on My Tutoring Hub</h2>
          <p className="muted">
            {averages.length} subjects, A–Z, with subject codes. Typical hourly rates appear when
            tutors are listed.
          </p>
          {groupSubjectsByLetter(averages).map(([letter, items]) => (
            <div key={letter} className="subject-alpha">
              <h3 className="subject-alpha-letter">{letter}</h3>
              <div className="subject-directory">
                {items.map((s) => (
                  <Link key={s.id} href={`/s/${s.slug}`} className="subject-tile">
                    <span className="subject-code">{subjectCode(s.name)}</span>
                    <span className="subject-tile-name">{s.name}</span>
                    <span className="subject-tile-rate">
                      {s.avg != null ? `~${formatHourly(s.avg, currency)}` : "View tutors"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
          </>
        )}
      </div>
    </div>
  );
}
