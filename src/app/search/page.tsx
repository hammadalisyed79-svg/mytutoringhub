import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { searchTutors } from "@/lib/search-tutors";
import { isBoostActive } from "@/lib/subscription";

export const metadata = { title: "Find tutors" };

type SearchParams = Promise<{
  q?: string;
  subject?: string;
  mode?: string;
  verified?: string;
  max?: string;
  location?: string;
  level?: string;
  trial?: string;
  language?: string;
  page?: string;
}>;

function searchQuery(sp: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.set(k, v);
  }
  params.set("page", String(page));
  return params.toString();
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const currency = await getVisitorCurrency();
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  const { tutors, total, page, pages } = await searchTutors(sp);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Find private tutors</h1>
        <p className="section-lead">
          Online or in-person lessons worldwide. Rates shown in your local currency (
          <strong>{currency}</strong>).
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
            <input name="location" defaultValue={sp.location || ""} placeholder="City or Online…" />
          </label>
          <label>
            Level
            <input name="level" defaultValue={sp.level || ""} placeholder="GCSE, A Level…" />
          </label>
          <label>
            Language
            <input name="language" defaultValue={sp.language || ""} placeholder="English…" />
          </label>
          <label>
            Format
            <select name="mode" defaultValue={sp.mode || ""}>
              <option value="">Online or in person</option>
              <option value="online">Online</option>
              <option value="inperson">In person / home</option>
            </select>
          </label>
          <label>
            Max budget (base)
            <input
              name="max"
              type="number"
              min={500}
              step={100}
              defaultValue={sp.max || ""}
              placeholder="Optional"
            />
          </label>
          <label className="radio filter-check">
            <input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} />
            Verified only
          </label>
          <label className="radio filter-check">
            <input type="checkbox" name="trial" value="1" defaultChecked={sp.trial === "1"} />
            Free trial offered
          </label>
          <button className="btn" type="submit">
            Search
          </button>
        </form>

        <p className="muted" style={{ marginBottom: "1rem" }}>
          {total} tutor{total === 1 ? "" : "s"} found
          {sp.subject ? ` for ${sp.subject}` : ""}
        </p>

        {tutors.length === 0 && (
          <div className="panel empty-state">
            <h2>No tutors match this search</h2>
            <p className="muted">
              Try a broader city, drop a filter, or post a student request so tutors can find you.
              Listings appear after a tutor activates Tutor Basic.
            </p>
            <p>
              <Link href="/ads/new" className="btn">
                Post a student request
              </Link>{" "}
              <Link href="/search" className="btn btn-secondary">
                Clear filters
              </Link>
            </p>
          </div>
        )}

        <div className="tutor-grid tutor-grid-list">
          {tutors.map((t) => {
            const avg =
              t.reviews.length > 0
                ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                : null;
            const boosted = isBoostActive(t.boostUntil);
            const highlighted =
              t.highlighted || (t.highlightedUntil && t.highlightedUntil > new Date());
            return (
              <Link
                key={t.id}
                href={`/tutors/${t.id}`}
                className={`tutor-card ${highlighted ? "highlighted" : ""}`}
              >
                <div className="tutor-avatar" aria-hidden>
                  {t.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.photoUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    t.user.name.slice(0, 1)
                  )}
                </div>
                <div className="tutor-card-body">
                  <div className="meta">
                    {boosted && <span className="badge accent">Boosted</span>}
                    {highlighted && <span className="badge accent">Highlighted</span>}
                    {t.verified && <span className="badge">Verified</span>}
                    {t.offersFreeTrial && <span className="badge">Free trial</span>}
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
                    <strong className="price-tag">{formatHourly(t.hourlyRate, currency)}</strong>
                    <span>{t.location || "Online"}</span>
                    <span>
                      {[t.online && "Online", t.inPerson && "In person"].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {pages > 1 && (
          <div className="pagination">
            {page > 1 && (
              <Link className="btn btn-secondary btn-sm" href={`/search?${searchQuery(sp, page - 1)}`}>
                Previous
              </Link>
            )}
            <span className="muted">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="btn btn-secondary btn-sm" href={`/search?${searchQuery(sp, page + 1)}`}>
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
