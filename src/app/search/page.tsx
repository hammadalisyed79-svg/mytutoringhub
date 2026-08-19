import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { searchTutors } from "@/lib/search-tutors";
import { isBoostActive } from "@/lib/subscription";
import { SearchFiltersForm } from "@/components/SearchFiltersForm";
import { curriculumCodeOptions, curriculumLevels } from "@/lib/curriculum";
import { POPULAR_SUBJECTS } from "@/lib/marketing";
import { relatedSubjects, resolveCity } from "@/lib/search-smart";
import { formatTutorPlace } from "@/lib/tutor-catalog";
import { catalogSubjectNames, mergeSubjectNames } from "@/lib/subject-catalog";

export const metadata = {
  title: "Find tutors",
  description:
    "Search private tutors by subject, city, language, and verified badge. Message with a Student Pass. Lesson fees stay off-platform.",
};

type SearchParams = Promise<{
  q?: string;
  subject?: string;
  mode?: string;
  verified?: string;
  max?: string;
  location?: string;
  country?: string;
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
  const subjectNames = mergeSubjectNames(
    subjects.map((s) => s.name),
    catalogSubjectNames(),
  );
  const { tutors, total, page, pages, resolved, locationRelaxed, keptCountry } = await searchTutors(sp, {
    currency,
    subjectNames,
  });
  const city = resolveCity(sp.location);
  const related = resolved.subject ? relatedSubjects(resolved.subject, subjectNames) : [];

  const placeLabel = [
    resolved.location && resolved.location !== "Online" ? resolved.location : "",
    resolved.country,
  ]
    .filter(Boolean)
    .join(", ");

  const summary = [
    total.toLocaleString(),
    total === 1 ? "tutor" : "tutors",
    resolved.subject ? `for ${resolved.subject}` : "",
    locationRelaxed
      ? keptCountry && resolved.country
        ? `— none in ${resolved.location}, showing ${resolved.country}`
        : `— none in ${resolved.location}, showing all locations`
      : placeLabel
        ? `in ${placeLabel}`
        : resolved.location === "Online"
          ? "online"
          : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Find private tutors</h1>
        <p className="section-lead">
          Search by subject, country, or city. Rates are shown in {currency}. Lesson fees stay between
          you and the tutor.
        </p>

        <SearchFiltersForm
          initial={sp}
          subjects={subjectNames}
          levels={curriculumLevels()}
          codes={curriculumCodeOptions()}
          currency={currency}
        />

        <div className="search-quick" aria-label="Popular subjects">
          {POPULAR_SUBJECTS.slice(0, 8).map((name) => (
            <Link
              key={name}
              href={`/search?subject=${encodeURIComponent(name)}`}
              className={`chip-btn ${resolved.subject === name ? "is-on" : ""}`}
            >
              {name}
            </Link>
          ))}
        </div>

        <p className="muted search-summary">{summary}</p>
        {city.matched && sp.location && city.value.toLowerCase() !== sp.location.trim().toLowerCase() && (
          <p className="search-didyoumean">
            Showing results for <strong>{city.value}</strong> instead of “{sp.location}”.
          </p>
        )}

        {tutors.length === 0 && (
          <div className="panel empty-state">
            <h2>No tutors match this search</h2>
            <p className="muted">
              Try a nearby city, search Online, or post a student request so tutors can find you.
              Listings appear after a tutor activates Tutor Basic.
            </p>
            {related.length > 0 && (
              <p className="search-related">
                Related subjects:{" "}
                {related.map((name) => (
                  <Link key={name} href={`/search?subject=${encodeURIComponent(name)}`}>
                    {name}
                  </Link>
                ))}
              </p>
            )}
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

        {locationRelaxed && tutors.length > 0 && (
          <p className="search-note">
            No {resolved.subject || "matching"} tutors in {resolved.location}
            {keptCountry && resolved.country ? `, ${resolved.country}` : ""}. Showing tutors who
            teach this subject {keptCountry && resolved.country ? `in ${resolved.country}` : "in other cities and online"}.
          </p>
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
                    <span>{formatTutorPlace(t.location, t.country) || "Online"}</span>
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
