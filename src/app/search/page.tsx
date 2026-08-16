import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Find tutors" };

type SearchParams = Promise<{
  q?: string;
  subject?: string;
  mode?: string;
  verified?: string;
  max?: string;
}>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  const tutors = await prisma.tutorProfile.findMany({
    where: {
      active: true,
      ...(sp.subject
        ? { subjects: { contains: sp.subject } }
        : sp.q
          ? {
              OR: [
                { subjects: { contains: sp.q } },
                { bio: { contains: sp.q } },
                { location: { contains: sp.q } },
                { headline: { contains: sp.q } },
                { user: { name: { contains: sp.q } } },
              ],
            }
          : {}),
      ...(sp.mode === "online" ? { online: true } : {}),
      ...(sp.mode === "inperson" ? { inPerson: true } : {}),
      ...(sp.verified === "1" ? { verified: true } : {}),
      ...(sp.max ? { hourlyRate: { lte: Number(sp.max) } } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: [{ highlighted: "desc" }, { verified: "desc" }, { hourlyRate: "asc" }],
  });

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Find a tutor</h1>
        <p className="section-lead">Filter by subject, format, and budget. Highlighted tutors appear first.</p>

        <form className="filters" method="get">
          <label>
            Search
            <input name="q" defaultValue={sp.q || ""} placeholder="Name, subject, city…" />
          </label>
          <label>
            Subject
            <select name="subject" defaultValue={sp.subject || ""}>
              <option value="">Any</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mode
            <select name="mode" defaultValue={sp.mode || ""}>
              <option value="">Any</option>
              <option value="online">Online</option>
              <option value="inperson">In person</option>
            </select>
          </label>
          <label>
            Max rate
            <input name="max" type="number" min={5} defaultValue={sp.max || ""} placeholder="e.g. 40" />
          </label>
          <label className="radio" style={{ alignSelf: "end", marginBottom: "0.55rem" }}>
            <input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} />
            Verified only
          </label>
          <button className="btn" type="submit" style={{ alignSelf: "end" }}>
            Apply
          </button>
        </form>

        <div className="results">
          {tutors.length === 0 && <p className="muted">No tutors match those filters yet.</p>}
          {tutors.map((t) => {
            const avg =
              t.reviews.length > 0
                ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                : null;
            return (
              <Link
                key={t.id}
                href={`/tutors/${t.id}`}
                className={`tutor-row ${t.highlighted ? "highlighted" : ""}`}
              >
                <div className="meta">
                  {t.highlighted && <span className="badge accent">Highlighted</span>}
                  {t.verified && <span className="badge">Verified</span>}
                  {avg !== null && <span>{avg.toFixed(1)} ★ ({t.reviews.length})</span>}
                </div>
                <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{t.user.name}</h2>
                <p style={{ margin: 0 }}>{t.headline || t.subjects}</p>
                <div className="meta">
                  <span>${t.hourlyRate}/hr</span>
                  <span>{t.location || "Location TBD"}</span>
                  <span>
                    {t.online ? "Online" : ""}
                    {t.online && t.inPerson ? " · " : ""}
                    {t.inPerson ? "In person" : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
