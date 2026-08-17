import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SUBJECT_CATEGORIES } from "@/lib/marketing";
import { averageRateForSubject, slugify } from "@/lib/search-tutors";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";

export const metadata = { title: "Subjects" };

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
          School boards, O/A Levels, IELTS, SAT, languages, and more — learn locally or online from
          anywhere. Open a subject page for tutors and typical hourly rates.
        </p>

        <div className="subject-cats">
          {SUBJECT_CATEGORIES.map((cat) => (
            <div key={cat.title} className="panel">
              <h2 style={{ marginTop: 0, fontSize: "1.35rem" }}>{cat.title}</h2>
              <ul>
                {cat.items.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/s/${slugify(item.slug)}`}>Private {item.name} lessons</Link>
                    {" · "}
                    <Link href={`/search?subject=${encodeURIComponent(item.slug)}`}>Search</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <section style={{ marginTop: "2.5rem" }}>
          <h2>All subjects on MyTutoringHub</h2>
          <div className="subject-chips" style={{ marginTop: "1rem" }}>
            {averages.map((s) => (
              <Link key={s.id} href={`/s/${s.slug}`} className="chip">
                {s.name}
                {s.avg != null ? ` · ~${formatHourly(s.avg, currency)}` : ""}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
