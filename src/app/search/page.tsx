import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { searchTutors } from "@/lib/search-tutors";
import { isBoostActive } from "@/lib/subscription";
import { SearchFiltersForm } from "@/components/SearchFiltersForm";
import { TutorAvatar } from "@/components/TutorAvatar";
import { curriculumCodeOptions, curriculumLevels } from "@/lib/curriculum";
import { POPULAR_SUBJECTS } from "@/lib/marketing";
import { relatedSubjects, resolveCity } from "@/lib/search-smart";
import { formatTutorPlace } from "@/lib/tutor-catalog";
import { catalogSubjectNames, mergeSubjectNames } from "@/lib/subject-catalog";
import { getUserCountry } from "@/lib/geo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find Private Tutors – GCSE, A-Level, IGCSE, IB & More",
  description:
    "Search verified private tutors by subject, city, country, or online. Filter by GCSE, A-Level, IGCSE, IB and more. Rates shown in your local currency.",
  alternates: { canonical: "/search" },
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
  const pinnedCountry = getUserCountry(await headers());
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
          pinnedCountry={pinnedCountry}
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

        <div className="tutor-grid tutor-grid-cards">
          {tutors.map((t) => {
            const avg =
              t.reviews.length > 0
                ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                : null;
            const boosted = isBoostActive(t.boostUntil);
            const highlighted =
              t.highlighted || (t.highlightedUntil && t.highlightedUntil > new Date());
            const isStarTutor = (t.planTier ?? 0) >= 2;
            const subjectChips = (t.subjects || "")
              .split(/[,;|]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 3);
            const levelChips = (t.levels || "")
              .split(/[,;|]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 2);
            const snippet = (t.bio || "").slice(0, 90).trim();
            const place = formatTutorPlace(t.location, t.country);
            const tutorName = t.user.name?.trim() || "Tutor";
            const modes = [t.online && "Online", t.inPerson && "In person"].filter(Boolean).join(" · ") || "Online";
            return (
              <article
                key={t.id}
                className={`tc-card tc-card-grid${highlighted ? " highlighted" : ""}${boosted ? " boosted" : ""}`}
              >
                <div className="tc-card-head">
                  <TutorAvatar
                    className="tc-avatar tc-avatar-card"
                    photoUrl={t.photoUrl}
                    cropX={t.photoCropX}
                    cropY={t.photoCropY}
                    cropZoom={t.photoCropZoom}
                    initial={tutorName.slice(0, 1).toUpperCase()}
                  />
                  {isStarTutor && (
                    <span className="tc-star-badge" title="Star Tutor">
                      Star tutor
                    </span>
                  )}
                </div>

                <div className="tc-card-main">
                  <div className="tc-card-title-row">
                    <h2 className="tc-name">
                      <Link href={`/tutors/${t.id}`}>{tutorName}</Link>
                    </h2>
                    {avg !== null && (
                      <span className="tc-rating" aria-label={`${avg.toFixed(1)} out of 5`}>
                        ★ {avg.toFixed(1)}
                        <span className="muted"> ({t.reviews.length})</span>
                      </span>
                    )}
                  </div>

                  {t.headline && <p className="tc-headline">{t.headline}</p>}

                  <div className="tc-rate-row">
                    <span className="tc-rate">{formatHourly(t.hourlyRate, currency)}</span>
                    <span className="tc-rate-label">/ hour</span>
                  </div>

                  <div className="tc-badges">
                    {t.verified && <span className="badge badge-verified">Verified</span>}
                    {boosted && <span className="badge accent">Boosted</span>}
                    {highlighted && <span className="badge accent">Featured</span>}
                    {t.offersFreeTrial && <span className="badge">Free trial</span>}
                  </div>

                  {snippet && (
                    <p className="tc-snippet tc-snippet-grid">
                      {snippet}{(t.bio || "").length > 90 ? "…" : ""}
                    </p>
                  )}

                  {(subjectChips.length > 0 || levelChips.length > 0) && (
                    <div className="tc-chips">
                      {subjectChips.map((s) => (
                        <span key={s} className="tc-chip">
                          {s}
                        </span>
                      ))}
                      {levelChips.map((l) => (
                        <span key={l} className="tc-chip tc-chip-level">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="tc-place muted">
                    {place ? `${place} · ${modes}` : modes}
                  </p>
                </div>

                <div className="tc-card-actions">
                  <Link href={`/messages?tutor=${t.id}`} className="btn btn-secondary btn-sm">
                    Message
                  </Link>
                  <Link href={`/tutors/${t.id}`} className="btn btn-sm">
                    View profile
                  </Link>
                </div>
              </article>
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
