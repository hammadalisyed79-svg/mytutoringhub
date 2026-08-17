import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/pakistan";

export const metadata = { title: "Find tutors" };

type SearchParams = Promise<{
  q?: string;
  subject?: string;
  mode?: string;
  verified?: string;
  max?: string;
  location?: string;
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
      ...(sp.location ? { location: { contains: sp.location } } : {}),
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
        <h1 className="page-title">Find private tutors in Pakistan</h1>
        <p className="section-lead">
          Matric, FSc, O/A Levels, IELTS, CSS — online or home tuition. Fees shown in PKR (Rs).
        </p>

        <form className="filters filters-wide" method="get">
          <label>
            Keyword
            <input name="q" defaultValue={sp.q || ""} placeholder="Tutor name, topic…" />
          </label>
          <label>
            Subject
            <select name="subject" defaultValue={sp.subject || ""}>
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <input
              name="location"
              defaultValue={sp.location || ""}
              placeholder="Karachi, Lahore, Online…"
            />
          </label>
          <label>
            Format
            <select name="mode" defaultValue={sp.mode || ""}>
              <option value="">Online or home tuition</option>
              <option value="online">Online lessons</option>
              <option value="inperson">Home / in-person</option>
            </select>
          </label>
          <label>
            Max Rs/hr
            <input
              name="max"
              type="number"
              min={500}
              step={100}
              defaultValue={sp.max || ""}
              placeholder="e.g. 2500"
            />
          </label>
          <label className="radio" style={{ alignSelf: "end", marginBottom: "0.55rem" }}>
            <input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} />
            Verified tutors only
          </label>
          <button className="btn" type="submit" style={{ alignSelf: "end" }}>
            Search
          </button>
        </form>

        <p className="muted" style={{ marginBottom: "1rem" }}>
          {tutors.length} tutor{tutors.length === 1 ? "" : "s"} found
          {sp.subject ? ` for ${sp.subject}` : ""}
        </p>

        <div className="tutor-grid tutor-grid-list">
          {tutors.length === 0 && (
            <p className="muted">
              No tutors match yet.{" "}
              <Link href="/ads/new">Post a student request</Link> so tutors can find you.
            </p>
          )}
          {tutors.map((t) => {
            const avg =
              t.reviews.length > 0
                ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                : null;
            return (
              <Link
                key={t.id}
                href={`/tutors/${t.id}`}
                className={`tutor-card ${t.highlighted ? "highlighted" : ""}`}
              >
                <div className="tutor-avatar" aria-hidden>
                  {t.user.name.slice(0, 1)}
                </div>
                <div className="tutor-card-body">
                  <div className="meta">
                    {t.highlighted && <span className="badge accent">Highlighted</span>}
                    {t.verified && <span className="badge">Verified</span>}
                    {avg !== null && (
                      <span>
                        {avg.toFixed(1)} ★ · {t.reviews.length} review
                        {t.reviews.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <h2>{t.user.name}</h2>
                  <p className="tutor-headline">{t.headline || t.subjects}</p>
                  <p className="muted clamp-2">{t.bio}</p>
                  <div className="meta">
                    <strong className="price-tag">{formatHourly(t.hourlyRate)}</strong>
                    <span>{t.location || "Pakistan"}</span>
                    <span>
                      {[t.online && "Online", t.inPerson && "Home tuition"]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
