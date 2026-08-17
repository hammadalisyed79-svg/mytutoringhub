import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SUBJECT_CATEGORIES } from "@/lib/marketing";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const dbSubjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Subjects</h1>
        <p className="section-lead">
          School boards, O/A Levels, IELTS, SAT, languages, and more — learn locally or online from
          anywhere.
        </p>

        <div className="subject-cats">
          {SUBJECT_CATEGORIES.map((cat) => (
            <div key={cat.title} className="panel">
              <h2 style={{ marginTop: 0, fontSize: "1.35rem" }}>{cat.title}</h2>
              <ul>
                {cat.items.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/search?subject=${encodeURIComponent(item.slug)}`}>
                      Private {item.name} lessons
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <section style={{ marginTop: "2.5rem" }}>
          <h2>All subjects on MyTutoringHub</h2>
          <div className="subject-chips" style={{ marginTop: "1rem" }}>
            {dbSubjects.map((s) => (
              <Link key={s.id} href={`/search?subject=${encodeURIComponent(s.name)}`} className="chip">
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
