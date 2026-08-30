import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { searchTutors, listingPath } from "@/lib/search-tutors";
import { isBoostActive } from "@/lib/subscription";
import { SearchFiltersForm } from "@/components/SearchFiltersForm";
import { GuidedTutorSearch } from "@/components/GuidedTutorSearch";
import { SearchStudentBanner } from "@/components/SearchStudentBanner";
import { ValuePropStrip } from "@/components/ValuePropStrip";
import { TutorAvatar } from "@/components/TutorAvatar";
import { isDefaultTutorBio, TUTOR_VERIFY_PROFILE_MESSAGE } from "@/lib/tutor-listing-copy";
import { curriculumBoards, curriculumCodeOptions, curriculumLevels } from "@/lib/curriculum";
import { RecentAndSavedTutors } from "@/components/RecentAndSavedTutors";
import { SaveTutorButton } from "@/components/SaveTutorButton";
import { POPULAR_SUBJECTS } from "@/lib/marketing";
import { relatedSubjects, resolveCity } from "@/lib/search-smart";
import { formatTutorAvailability } from "@/lib/tutor-catalog";
import { catalogSubjectNames, mergeSubjectNames } from "@/lib/subject-catalog";
import { getUserCountry } from "@/lib/geo";
import { getVisitorRegion } from "@/lib/visitor-region";
import { VALUE_PROPOSITION, STUDENT_FREE_CONTACTS_LINE } from "@/lib/marketing-copy";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { searchResultsShouldNoIndex } from "@/lib/seo-indexation";
import { trackProductEvent } from "@/lib/product-events";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  subject?: string;
  mode?: string;
  verified?: string;
  max?: string;
  location?: string;
  country?: string;
  level?: string;
  board?: string;
  trial?: string;
  language?: string;
  page?: string;
  sort?: string;
  syllabusCode?: string;
  browse?: string;
  guided?: string;
}>;

function studentRequestHref(sp: {
  subject?: string;
  level?: string;
  location?: string;
  country?: string;
  mode?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (sp.subject) params.set("subject", sp.subject);
  if (sp.level) params.set("level", sp.level);
  if (sp.location) params.set("location", sp.location);
  if (sp.country) params.set("country", sp.country);
  if (sp.mode === "online") params.set("online", "1");
  if (sp.mode === "inperson") params.set("inPerson", "1");
  if (sp.q) params.set("q", sp.q);
  if ("board" in sp && sp.board) params.set("board", String(sp.board));
  if ("syllabusCode" in sp && sp.syllabusCode) params.set("syllabusCode", String(sp.syllabusCode));
  const qs = params.toString();
  return qs ? `/ads/new?${qs}` : "/ads/new";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  const parts = [
    sp.subject && `${sp.subject} tutors`,
    sp.location && sp.location !== "Online" && `in ${sp.location}`,
    sp.country && !sp.location && `in ${sp.country}`,
    sp.level && sp.level,
  ].filter(Boolean);

  const title =
    parts.length > 0
      ? `${parts.join(" ")} – Private Tutors`
      : "Find Private Tutors – GCSE, A-Level, IGCSE, IB & More";

  const description = truncateDescription(
    parts.length > 0
      ? `Search ${parts.join(" ")} on My Tutoring Hub. Compare rates and reviews. ${STUDENT_FREE_CONTACTS_LINE} ${VALUE_PROPOSITION}`
      : `Search private tutors by subject, city, country, or online. Filter by GCSE, A-Level, IGCSE, IB and more. Rates in your local currency. ${STUDENT_FREE_CONTACTS_LINE}`,
  );

  return pageMetadata({
    title,
    description,
    // Always canonicalize to the hub URL; filtered permutations stay usable but noindex.
    path: "/search",
    noIndex: searchResultsShouldNoIndex({ ...sp, page: String(pageNum) }),
  });
}

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
  const session = await auth();
  const currency = await getVisitorCurrency();
  const headersList = await headers();
  const pinnedCountry = getUserCountry(headersList);
  const region = getVisitorRegion(headersList);
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  const subjectNames = mergeSubjectNames(
    subjects.map((s) => s.name),
    catalogSubjectNames(),
  );
  const { tutors, total, page, pages, resolved, locationRelaxed, keptCountry, tutorCapApplied } =
    await searchTutors(sp, {
    currency,
    subjectNames,
  });
  const city = resolveCity(sp.location);
  const related = resolved.subject ? relatedSubjects(resolved.subject, subjectNames) : [];
  const hasSearchIntent = Boolean(
    sp.subject ||
      sp.q ||
      sp.location ||
      sp.country ||
      sp.mode ||
      sp.level ||
      sp.board ||
      sp.syllabusCode ||
      sp.language ||
      sp.max ||
      sp.verified ||
      sp.trial ||
      sp.sort ||
      sp.browse === "1",
  );
  const showGuided = sp.guided === "1" || !hasSearchIntent;

  if (hasSearchIntent && !showGuided) {
    trackProductEvent(tutors.length === 0 ? "search_zero_results" : "search_results_shown", {
      total,
      page,
      subject: resolved.subject || null,
      location: resolved.location || null,
      country: resolved.country || null,
      level: resolved.level || null,
      board: resolved.board || null,
      listingIds: tutors
        .map((t) => t.listingId || t.id)
        .filter(Boolean)
        .slice(0, 50)
        .join(","),
      resultCount: tutors.length,
    });
  }

  const placeLabel = [
    resolved.location && resolved.location !== "Online" ? resolved.location : "",
    resolved.country,
  ]
    .filter(Boolean)
    .join(", ");

  const summary = [
    total.toLocaleString(),
    total === 1 ? "Teaching Profile" : "Teaching Profiles",
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
        <p className="section-lead">{VALUE_PROPOSITION}</p>
        <ValuePropStrip />

        {session?.user?.role === "STUDENT" && (
          <SearchStudentBanner userId={session.user.id} role={session.user.role} />
        )}
        {!session?.user && (
          <p className="muted search-guest-hint">{STUDENT_FREE_CONTACTS_LINE}</p>
        )}

        {showGuided ? (
          <>
            <GuidedTutorSearch
              subjects={subjectNames}
              codes={curriculumCodeOptions()}
              pinnedCountry={pinnedCountry}
              cityPlaceholder={region.cityPlaceholder}
              initial={{
                subject: sp.subject,
                country: sp.country,
                location: sp.location,
                mode: sp.mode,
                level: sp.level,
              }}
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
          </>
        ) : (
          <>
            <SearchFiltersForm
              initial={sp}
              subjects={subjectNames}
              levels={curriculumLevels()}
              boards={curriculumBoards()}
              codes={curriculumCodeOptions()}
              currency={currency}
              pinnedCountry={pinnedCountry}
              searchQueryPlaceholder={region.searchQueryPlaceholder}
              defaultCityPlaceholder={region.cityPlaceholder}
              levelPlaceholder={region.levelPlaceholder}
            />
            <p className="muted search-summary">{summary}</p>
            {tutorCapApplied && (
              <p className="search-note muted">
                Up to 2 Teaching Profiles per tutor are shown on each page. Extra profiles appear on
                later pages or on the tutor’s own listings.
              </p>
            )}
            <RecentAndSavedTutors />
          </>
        )}

        {!showGuided && city.matched && sp.location && city.value.toLowerCase() !== sp.location.trim().toLowerCase() && (
          <p className="search-didyoumean">
            Showing results for <strong>{city.value}</strong> instead of “{sp.location}”.
          </p>
        )}

        {!showGuided && (
          <>
        {tutors.length === 0 && (
          <div className="panel empty-state">
            <h2>
              {sp.verified === "1"
                ? "We couldn’t find a verified tutor for this yet"
                : "We couldn’t find the right tutor yet"}
            </h2>
            <p className="muted">
              Post your requirement with these filters pre-filled — tutors who match can message
              you. Or broaden city / browse online tutors.
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
            <p className="hero-ctas" style={{ flexWrap: "wrap" }}>
              <Link href={studentRequestHref(sp)} className="btn">
                Post your requirement
              </Link>
              <Link href="/search?mode=online" className="btn btn-secondary">
                Browse online tutors
              </Link>
              <Link href="/search" className="btn btn-secondary">
                Clear filters
              </Link>
            </p>
          </div>
        )}

        {tutors.length > 0 && tutors.length < 3 && (
          <p className="search-note muted">
            Few tutors match right now — try{" "}
            <Link href="/search?mode=online">online</Link>, a nearby city, or{" "}
            <Link href={studentRequestHref(sp)}>post your requirement</Link> so tutors can reach you.
          </p>
        )}

        {locationRelaxed && tutors.length > 0 && (
          <p className="search-note">
            No {resolved.subject || "matching"} tutors in {resolved.location}
            {keptCountry && resolved.country ? `, ${resolved.country}` : ""}. Showing tutors who
            teach this subject {keptCountry && resolved.country ? `in ${resolved.country}` : "in other cities and online"}.
          </p>
        )}

        <div className="tutor-grid tutor-grid-cards search-results-enter">
          {tutors.map((t) => {
            const avg =
              t.reviews.length > 0
                ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                : null;
            const boosted = isBoostActive(t.boostUntil);
            const subjectChips = [t.subject].map((s) => s.trim()).filter(Boolean);
            const snippet = isDefaultTutorBio(t.bio) ? "" : (t.bio || "").slice(0, 90).trim();
            const reviewSnippet = (t.reviews.find((r) => r.comment?.trim())?.comment || "")
              .slice(0, 72)
              .trim();
            const availability = formatTutorAvailability({
              location: t.location,
              country: t.country,
              online: t.online,
              inPerson: t.inPerson,
            });
            const tutorName = t.user.name?.trim() || "Tutor";
            const isOwner = session?.user?.id === t.user.id;
            const alsoTeaches = (t.alsoTeaches || []).slice(0, 3);
            const showSnippet = !t.headline && snippet;
            return (
              <article
                key={t.id}
                className={`tc-card tc-card-pro${boosted ? " boosted" : ""}`}
              >
                <div className="tc-card-media">
                  <TutorAvatar
                    className="tc-avatar tc-avatar-card"
                    photoUrl={t.photoUrl}
                    cropX={t.photoCropX}
                    cropY={t.photoCropY}
                    cropZoom={t.photoCropZoom}
                    initial={tutorName.slice(0, 1).toUpperCase()}
                  />
                  <SaveTutorButton
                    compact
                    className="tc-card-save"
                    tutor={{
                      tutorProfileId: t.tutorProfileId,
                      listingId: t.id,
                      name: tutorName,
                      subject: t.subject,
                      photoUrl: t.photoUrl,
                      href: listingPath(t.id),
                    }}
                  />
                </div>

                <div className="tc-card-main">
                  <div className="tc-card-title-row">
                    <h2 className="tc-name">
                      <Link href={listingPath(t.id)}>{tutorName}</Link>
                    </h2>
                    <div className="tc-card-title-meta">
                      {avg !== null && (
                        <span className="tc-rating" aria-label={`${avg.toFixed(1)} out of 5 from ${t.reviews.length} reviews`}>
                          ★ {avg.toFixed(1)}
                          <span className="muted"> ({t.reviews.length})</span>
                        </span>
                      )}
                      <span className="tc-rate">{formatHourly(t.hourlyRate, currency)}</span>
                    </div>
                  </div>

                  {t.headline && <p className="tc-headline">{t.headline}</p>}
                  {showSnippet && (
                    <p className="tc-snippet tc-snippet-grid">
                      {snippet}
                      {(t.bio || "").length > 90 ? "…" : ""}
                    </p>
                  )}

                  {(t.board || t.qualification || t.syllabusCode) && (
                    <p className="tc-listing-taxonomy muted">
                      {[t.board, t.qualification, t.syllabusCode].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  <div className="tc-card-meta-row">
                    <p className="tc-place muted">{availability}</p>
                    <div className="tc-badges">
                      {isOwner ? (
                        !t.verified && (
                          <span className="badge tutor-owner-verify-badge" title={TUTOR_VERIFY_PROFILE_MESSAGE}>
                            Not Verified
                          </span>
                        )
                      ) : (
                        t.verified && <span className="badge badge-verified">Identity Verified</span>
                      )}
                      {boosted && <span className="badge accent">Boosted</span>}
                      {t.offersFreeTrial && <span className="badge">Free trial</span>}
                    </div>
                  </div>

                  {isOwner && !t.verified && (
                    <p className="tc-owner-verify-hint muted">{TUTOR_VERIFY_PROFILE_MESSAGE}</p>
                  )}

                  {reviewSnippet && (
                    <p className="tc-review-snippet muted">
                      “{reviewSnippet}
                      {(t.reviews.find((r) => r.comment?.trim())?.comment || "").length > 72 ? "…" : ""}”
                    </p>
                  )}

                  {subjectChips.length > 0 && (
                    <div className="tc-chips">
                      {subjectChips.map((s) => (
                        <span key={s} className="tc-chip">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {alsoTeaches.length > 0 && (
                    <p className="tc-also-teaches muted">
                      Also teaches:{" "}
                      {alsoTeaches.map((item, i) => (
                        <span key={item.listingId}>
                          {i > 0 ? " · " : ""}
                          <Link href={listingPath(item.listingId)}>{item.subject || item.title}</Link>
                        </span>
                      ))}
                    </p>
                  )}

                  <div className="tc-card-actions">
                    <Link href={listingPath(t.id)} className="btn btn-sm">
                      View Teaching Profile
                    </Link>
                    {session?.user ? (
                      <Link href={`/messages?to=${t.user.id}`} className="btn btn-secondary btn-sm">
                        Message
                      </Link>
                    ) : (
                      <Link
                        href={`/login?callbackUrl=${encodeURIComponent(`/messages?to=${t.user.id}`)}`}
                        className="btn btn-secondary btn-sm"
                        aria-label="Sign in to message this tutor"
                      >
                        Message
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {pages > 1 && (
          <nav className="pagination panel panel-actions" aria-label="Search results pages">
            {page > 1 && (
              <Link className="btn btn-secondary btn-sm" href={`/search?${searchQuery(sp, page - 1)}`}>
                Previous
              </Link>
            )}
            <span className="muted pagination-status">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="btn btn-secondary btn-sm" href={`/search?${searchQuery(sp, page + 1)}`}>
                Next
              </Link>
            )}
          </nav>
        )}
          </>
        )}
      </div>
    </div>
  );
}
