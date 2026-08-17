import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SUBJECT_CATEGORIES } from "@/lib/marketing";
import { CountryMarkets } from "@/components/CountryMarkets";
import { averageRateForSubject, slugify } from "@/lib/search-tutors";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";

export const metadata = {
  title: "Subjects",
  description:
    "Top tutoring subjects across 15 countries including Pakistan (PK), India, the UK, UAE, and the US. Browse by country code and subject.",
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

export default async function SubjectsPage() {
  const currency = await getVisitorCurrency();
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
          Pakistan (PK). Open a country below or a subject page for tutors and typical hourly rates.
        </p>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2>Top 15 countries</h2>
          <p className="muted">
            Each card shows the ISO country code and the subjects students search most in that market.
          </p>
          <CountryMarkets />
        </section>

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
            {averages.length} subjects, A–Z. Typical hourly rates appear when tutors are listed.
          </p>
          {groupSubjectsByLetter(averages).map(([letter, items]) => (
            <div key={letter} className="subject-alpha">
              <h3 className="subject-alpha-letter">{letter}</h3>
              <div className="subject-directory">
                {items.map((s) => (
                  <Link key={s.id} href={`/s/${s.slug}`} className="subject-tile">
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
      </div>
    </div>
  );
}
