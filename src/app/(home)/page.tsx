import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeroSearch } from "@/components/HeroSearch";
import { PrestigePillars } from "@/components/PrestigePillars";
import { LoggedInWelcome } from "@/components/LoggedInWelcome";
import { LogoMark } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { TutorAvatar } from "@/components/TutorAvatar";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { POPULAR_SUBJECTS } from "@/lib/marketing";
import { CURRICULUM } from "@/lib/curriculum";
import { CountryMarkets } from "@/components/CountryMarkets";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";
import { getUserCountry } from "@/lib/geo";
import { getVisitorRegion } from "@/lib/visitor-region";
import {
  publicListedTutorWhere,
  canViewTutorProfilePublicly,
  tutorPublicVisibilityInput,
} from "@/lib/tutor-public-eligibility";
import { listingPath } from "@/lib/subject-profile";
import {
  HOMEPAGE_PRODUCT_TRIO,
  HOMEPAGE_PRODUCT_TRIO_LEAD,
  VALUE_PROPOSITION,
  GEO_CURRENCY_LINE,
  studentFreeContactsShort,
} from "@/lib/marketing-copy";
import { BUSINESS, NO_LESSON_COMMISSION_SHORT } from "@/lib/business-rules";
import { RecentAndSavedTutors } from "@/components/RecentAndSavedTutors";
import { organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { catalogSubjectNames } from "@/lib/subject-catalog";
import { formatTutorAvailability } from "@/lib/tutor-catalog";
import {
  dedupeFeaturedListingsByTutor,
  featuredListingContextLine,
  featuredShortLine,
  pickHeroShowcaseTutor,
} from "@/lib/featured-tutors";
import { documentTypeLabel } from "@/lib/past-papers/stored-filename";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Find Expert Private Tutors Online – GCSE, A-Level, IGCSE & IB",
  description: `${VALUE_PROPOSITION} Browse tutors by subject and city. ${GEO_CURRENCY_LINE}`,
  path: "/",
});

const PAST_PAPER_FILTER_PREVIEW = [
  "Board",
  "Qualification",
  "Subject",
  "Year",
  "Session",
  "Document type",
] as const;

export default async function HomePage() {
  const session = await auth();
  const currency = await getVisitorCurrency();
  const headersList = await headers();
  const pinnedCountry = getUserCountry(headersList);
  const region = getVisitorRegion(headersList);
  const curriculumCodeCount = CURRICULUM.length;
  const [pastPaperCount, featuredRaw, heroPastPaper] = await Promise.all([
    prisma.pastPaper.count({ where: publicAvailabilityWhere() }),
    prisma.subjectProfile.findMany({
      where: {
        status: "ACTIVE",
        tutorProfile: publicListedTutorWhere(),
      },
      orderBy: [{ highlightedUntil: "desc" }, { boostUntil: "desc" }, { updatedAt: "desc" }],
      take: 48,
      select: {
        id: true,
        subject: true,
        title: true,
        headline: true,
        rate: true,
        level: true,
        board: true,
        qualification: true,
        tutorProfile: {
          select: {
            id: true,
            verified: true,
            photoUrl: true,
            photoCropX: true,
            photoCropY: true,
            photoCropZoom: true,
            active: true,
            forceActive: true,
            bio: true,
            country: true,
            location: true,
            online: true,
            inPerson: true,
            qualifications: true,
            user: { select: { name: true, emailVerified: true, suspended: true } },
            reviews: { select: { rating: true } },
          },
        },
      },
    }),
    prisma.pastPaper.findFirst({
      where: publicAvailabilityWhere(),
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
      select: {
        board: true,
        qualification: true,
        subject: true,
        year: true,
        session: true,
        documentType: true,
        paperType: true,
      },
    }),
  ]);

  const featuredEligible = featuredRaw
    .filter((row) => canViewTutorProfilePublicly(tutorPublicVisibilityInput(row.tutorProfile)))
    .map((row) => {
      const p = row.tutorProfile;
      return {
        listingId: row.id,
        tutorProfileId: p.id,
        subject: row.subject,
        headline: row.headline || row.title || p.user.name,
        hourlyRate: row.rate,
        verified: p.verified,
        photoUrl: p.photoUrl,
        photoCropX: p.photoCropX,
        photoCropY: p.photoCropY,
        photoCropZoom: p.photoCropZoom,
        user: p.user,
        reviews: p.reviews,
        bio: p.bio,
        contextLine: featuredListingContextLine({
          qualification: row.qualification,
          board: row.board,
          level: row.level,
        }),
        availability: formatTutorAvailability({
          location: p.location,
          country: p.country,
          online: p.online,
          inPerson: p.inPerson,
        }),
      };
    });

  const featured = dedupeFeaturedListingsByTutor(featuredEligible, 4);
  const heroTutor = pickHeroShowcaseTutor(featuredEligible);

  const heroPaperHref = (() => {
    if (!heroPastPaper) return "/past-papers";
    const params = new URLSearchParams();
    if (heroPastPaper.board) params.set("board", heroPastPaper.board);
    if (heroPastPaper.qualification) params.set("qualification", heroPastPaper.qualification);
    if (heroPastPaper.subject) params.set("subject", heroPastPaper.subject);
    if (heroPastPaper.year) params.set("year", String(heroPastPaper.year));
    const q = params.toString();
    return q ? `/past-papers?${q}` : "/past-papers";
  })();

  const heroPaperTypeLabel =
    heroPastPaper && (heroPastPaper.documentType || heroPastPaper.paperType)
      ? documentTypeLabel(heroPastPaper.documentType || heroPastPaper.paperType)
      : "";

  const heroPaperTaxonomy = heroPastPaper
    ? [
        heroPastPaper.board,
        heroPastPaper.qualification,
        heroPastPaper.subject,
        heroPastPaper.year ? String(heroPastPaper.year) : "",
        heroPaperTypeLabel || heroPastPaper.paperType,
      ]
        .map((s) => (s || "").trim())
        .filter(Boolean)
    : [];

  const stats = [
    curriculumCodeCount > 0 && {
      value: curriculumCodeCount.toLocaleString(),
      label: "Curriculum subject codes",
    },
    pastPaperCount > 0 && {
      value: pastPaperCount.toLocaleString(),
      label: pastPaperCount === 1 ? "Past paper" : "Past papers",
    },
  ].filter(Boolean) as { value: string; label: string }[];

  const pastPaperLabel = pastPaperCount.toLocaleString();

  return (
    <div className="home-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organizationJsonLd(), websiteJsonLd()],
        }}
      />
      <section className="hero hero-findtutor hero-split" aria-labelledby="home-hero-title">
        <div className="hero-content hero-split-inner">
          <div className="hero-split-copy">
            {session?.user && (
              <LoggedInWelcome
                userId={session.user.id}
                name={session.user.name || "there"}
                role={session.user.role as "STUDENT" | "TUTOR" | "ADMIN"}
              />
            )}
            <div className="hero-brand-row">
              <LogoMark className="hero-brand-mark" />
              <p className="hero-kicker">World-class tutoring marketplace</p>
            </div>
            <h1 id="home-hero-title">Private tutoring, elevated.</h1>
            <p className="hero-lead">
              Find the right tutor for your subject, exam or goal — online or near you. Search free
              and contact tutors directly.
            </p>
            <div className="hero-search-shell">
              <HeroSearch
                placeholder={region.searchPlaceholder}
                suggestedCountry={region.countryName}
                subjects={[...new Set([...POPULAR_SUBJECTS, ...catalogSubjectNames()])].slice(0, 80)}
              />
            </div>
            <p className="hero-microcopy">
              {BUSINESS.studentFreeContactsPerMonth} tutor contacts/month free ·{" "}
              {NO_LESSON_COMMISSION_SHORT}
            </p>
            <p className="hero-teach-link">
              Looking to teach? <Link href="/become-a-tutor">Become a tutor →</Link>
            </p>
          </div>

          <div className="hero-split-visual" aria-label="Product preview">
            <div className="hero-compose">
              {heroTutor ? (
                <article className="hero-tutor-card">
                  <TutorAvatar
                    className="tutor-avatar hero-tutor-avatar"
                    photoUrl={heroTutor.photoUrl}
                    cropX={heroTutor.photoCropX}
                    cropY={heroTutor.photoCropY}
                    cropZoom={heroTutor.photoCropZoom}
                    initial={(heroTutor.user.name?.trim() || "T").slice(0, 1).toUpperCase()}
                    priority
                  />
                  <div className="hero-tutor-card-body">
                    {heroTutor.verified ? (
                      <span className="badge badge-verified">Identity Verified</span>
                    ) : null}
                    <h2 className="hero-tutor-name">{heroTutor.user.name?.trim()}</h2>
                    <p className="hero-tutor-subject">{heroTutor.subject}</p>
                    {heroTutor.contextLine ? (
                      <p className="muted hero-tutor-context">{heroTutor.contextLine}</p>
                    ) : null}
                    <div className="hero-tutor-meta">
                      <span>{formatHourly(heroTutor.hourlyRate, currency)}</span>
                      {heroTutor.availability ? <span>{heroTutor.availability}</span> : null}
                    </div>
                    <Link href={listingPath(heroTutor.listingId)} className="btn btn-secondary btn-sm">
                      View profile
                    </Link>
                  </div>
                </article>
              ) : (
                <article className="hero-tutor-card hero-tutor-card--fallback">
                  <div className="hero-tutor-card-body">
                    <p className="hero-kicker">Discover tutors</p>
                    <h2 className="hero-tutor-name">Browse real teaching listings</h2>
                    <p className="muted">
                      Search by subject, exam board, and location — contact tutors directly.
                    </p>
                    <Link href="/search" className="btn btn-secondary btn-sm">
                      Search tutors
                    </Link>
                  </div>
                </article>
              )}

              {heroPastPaper && heroPaperTaxonomy.length > 0 ? (
                <Link href={heroPaperHref} className="hero-paper-card">
                  <span className="hero-paper-eyebrow">Past papers</span>
                  <span className="hero-paper-preview" aria-hidden="true">
                    <span className="hero-paper-sheet">
                      <span className="hero-paper-rule" />
                      <span className="hero-paper-rule" />
                      <span className="hero-paper-rule short" />
                    </span>
                  </span>
                  <span className="hero-paper-taxonomy">
                    {heroPaperTaxonomy.map((part, i) => (
                      <span key={`${i}-${part}`}>{part}</span>
                    ))}
                  </span>
                  <span className="hero-paper-cta">Browse past papers →</span>
                </Link>
              ) : null}

              <Link href="/assistant" className="hero-study-chip">
                Study support · progress &amp; countdown
              </Link>
            </div>
          </div>
        </div>
      </section>

      <RecentAndSavedTutors
        className="home-continue-rail"
        recentHeading="Continue where you left off"
      />

      <section className="section product-trio-section" aria-labelledby="product-trio-title">
        <div className="container">
          <h2 id="product-trio-title" className="product-trio-title">
            {HOMEPAGE_PRODUCT_TRIO}
          </h2>
          <p className="section-lead">{HOMEPAGE_PRODUCT_TRIO_LEAD}</p>
          <div className="product-trio-grid">
            <Link href="/search" className="product-trio-card">
              <strong>Find tutors</strong>
              <span className="muted">Browse free · 3 new contacts/month included</span>
            </Link>
            <Link href="/past-papers" className="product-trio-card">
              <strong>Past papers</strong>
              <span className="muted">Exam papers by board, year, and session</span>
            </Link>
            <Link href="/assistant" className="product-trio-card">
              <strong>Study support</strong>
              <span className="muted">Countdown, progress logs, and AI assistant</span>
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section section-alt home-featured-tutors" aria-labelledby="featured-tutors-title">
          <div className="container">
            <div className="section-head">
              <div>
                <h2 id="featured-tutors-title">Featured tutors</h2>
                <p className="section-lead">Real tutors with active teaching listings — one card each.</p>
              </div>
              <Link href="/search" className="btn btn-secondary">
                See all tutors
              </Link>
            </div>
            <div className={`tutor-grid home-featured-grid home-featured-grid--${Math.min(featured.length, 4)}`}>
              {featured.map((t) => {
                const avg =
                  t.reviews.length > 0
                    ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                    : null;
                const tutorName = t.user.name?.trim() || "Tutor";
                const short = featuredShortLine(t.headline || t.bio);
                return (
                  <article key={t.tutorProfileId} className="tutor-card home-featured-card">
                    <TutorAvatar
                      className="tutor-avatar"
                      photoUrl={t.photoUrl}
                      cropX={t.photoCropX}
                      cropY={t.photoCropY}
                      cropZoom={t.photoCropZoom}
                      initial={tutorName.slice(0, 1).toUpperCase()}
                    />
                    <div className="home-featured-card-body">
                      <div className="meta">
                        {t.verified && <span className="badge badge-verified">Identity Verified</span>}
                      </div>
                      <h3>{tutorName}</h3>
                      <p className="home-featured-subject">{t.subject}</p>
                      {t.contextLine ? <p className="muted home-featured-context">{t.contextLine}</p> : null}
                      {short ? <p className="home-featured-line">{short}</p> : null}
                      <div className="meta">
                        <span>{formatHourly(t.hourlyRate, currency)}</span>
                        {t.availability ? <span>{t.availability}</span> : null}
                        {avg !== null && <span>{avg.toFixed(1)} ★</span>}
                      </div>
                      <Link href={listingPath(t.listingId)} className="btn btn-secondary home-featured-cta">
                        View profile
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="how-it-works-title">
        <div className="container">
          <h2 id="how-it-works-title">How My Tutoring Hub works</h2>
          <p className="section-lead">Search, contact, and arrange lessons in three clear steps.</p>
          <div className="steps home-steps-connected">
            <div className="step">
              <span>1</span>
              <h3>Search</h3>
              <p className="muted">Tell us what you want to learn and pick tutors that fit.</p>
            </div>
            <div className="step">
              <span>2</span>
              <h3>Contact</h3>
              <p className="muted">
                Message tutors free ({studentFreeContactsShort()}) or unlimited with Student Pass.
              </p>
            </div>
            <div className="step">
              <span>3</span>
              <h3>Learn</h3>
              <p className="muted">Arrange lessons and pay your tutor directly — flexible and personal.</p>
            </div>
          </div>
          <p className="section-actions">
            <Link href="/search" className="btn">
              Find a tutor
            </Link>
          </p>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="popular-subjects-title">
        <div className="container">
          <h2 id="popular-subjects-title">Popular subjects</h2>
          <p className="section-lead">High-demand subjects across school, exams, and university.</p>
          <div className="subject-chips home-subject-chips">
            {POPULAR_SUBJECTS.map((s) => (
              <Link key={s} href={`/search?subject=${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
          </div>
          <p className="section-actions">
            <Link href="/subjects" className="btn btn-secondary">
              Browse all subjects
            </Link>
          </p>
        </div>
      </section>

      {pastPaperCount > 0 && (
        <section className="section home-past-papers" aria-labelledby="home-past-papers-title">
          <div className="container home-past-papers-inner">
            <div className="home-past-papers-copy">
              <p className="eyebrow">Exam preparation</p>
              <h2 id="home-past-papers-title">
                {pastPaperLabel} past papers. And tutors when you need help.
              </h2>
              <p className="section-lead">
                Filter by board, qualification, subject, year, and session — then find a tutor who
                teaches that exam track.
              </p>
              <div className="hero-ctas">
                <Link href="/past-papers" className="btn">
                  Browse Past Papers
                </Link>
                <Link href="/search" className="btn btn-secondary">
                  Find an exam tutor
                </Link>
              </div>
            </div>
            <div className="home-past-papers-preview" aria-hidden="true">
              <p className="home-pp-preview-label">Filter past papers</p>
              <ul className="home-pp-filters">
                {PAST_PAPER_FILTER_PREVIEW.map((label) => (
                  <li key={label}>
                    <span>{label}</span>
                    <span className="home-pp-filter-slot" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {stats.length > 0 && (
        <section className="section section-stats prestige-stats home-stats-compact">
          <div className="container stats-row">
            {stats.map((stat) => (
              <div key={stat.label} className="prestige-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section section-alt home-student-request" aria-labelledby="student-request-title">
        <div className="container home-student-request-inner">
          <div>
            <h2 id="student-request-title">Can&apos;t find the right tutor?</h2>
            <p className="section-lead">
              Post what you need — matching tutors can reply with how they can help.
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/ads/new" className="btn">
              Post what you need
            </Link>
            <Link href="/ads" className="btn btn-secondary">
              Browse requests
            </Link>
          </div>
        </div>
      </section>

      <PrestigePillars curriculaLine={region.curriculaLine} />

      <section className="section section-alt home-free-summary" aria-labelledby="free-summary-title">
        <div className="container">
          <h2 id="free-summary-title">Start free. Upgrade when you need more.</h2>
          <div className="home-free-summary-grid">
            <div>
              <h3>Students</h3>
              <p className="muted">
                Search free and contact up to {BUSINESS.studentFreeContactsPerMonth} new tutors each
                month. Upgrade for unlimited contacts and study tools.
              </p>
            </div>
            <div>
              <h3>Tutors</h3>
              <p className="muted">
                Create a profile and up to {BUSINESS.tutorFreeActiveListings} active Teaching Listings
                free. Tutor Pro supports up to {BUSINESS.tutorProActiveListings} and growth tools.
              </p>
            </div>
          </div>
          <p className="section-actions">
            <Link href="/pricing" className="btn btn-secondary">
              Compare plans
            </Link>
          </p>
        </div>
      </section>

      <section
        className="section home-tutor-recruit"
        aria-labelledby="home-tutor-recruit-title"
      >
        <div className="container home-tutor-recruit-inner">
          <div>
            <h2 id="home-tutor-recruit-title">Teach students worldwide</h2>
            <p className="section-lead">
              Create your tutor profile free and reach students internationally. Keep 100% of lesson
              fees — 0% commission on lessons. Up to {BUSINESS.tutorFreeActiveListings} free teaching
              listings; Tutor Pro unlocks up to {BUSINESS.tutorProActiveListings}.
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/become-a-tutor" className="btn">
              Become a tutor
            </Link>
            <Link href="/pricing" className="btn btn-secondary">
              Tutor plans
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt home-markets" aria-labelledby="home-markets-title">
        <div className="container">
          <h2 id="home-markets-title">Tutoring markets</h2>
          <p className="section-lead">
            Priority countries with popular cities and subjects — explore more anytime.
          </p>
          <CountryMarkets compact pinnedCountry={pinnedCountry} />
        </div>
      </section>

      <section className="section cta-band">
        <div className="container cta-band-inner">
          <div>
            <h2>Ready to start?</h2>
            <p>Find a tutor free, or create your profile and teach worldwide.</p>
          </div>
          <div className="hero-ctas">
            <Link href="/search" className="btn">
              Find a tutor
            </Link>
            <Link href="/become-a-tutor" className="btn btn-secondary">
              Become a tutor
            </Link>
          </div>
        </div>
        <p className="container home-invite-nudge">
          <Link href="/become-a-tutor">Know a great tutor? Invite them →</Link>
        </p>
      </section>
    </div>
  );
}
