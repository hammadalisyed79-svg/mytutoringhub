import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeroSearch } from "@/components/HeroSearch";
import { HeroPathCards } from "@/components/HeroPathCards";
import { PrestigePillars } from "@/components/PrestigePillars";
import { LoggedInWelcome } from "@/components/LoggedInWelcome";
import { LogoMark } from "@/components/Logo";
import { ValuePropStrip } from "@/components/ValuePropStrip";
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
import { publicListedTutorWhere, filterCanonicallyPublicTutors, canViewTutorProfilePublicly, tutorPublicVisibilityInput } from "@/lib/tutor-public-eligibility";
import { listingPath } from "@/lib/subject-profile";
import { isHighlightActive } from "@/lib/subscription";
import {
  HOMEPAGE_PRODUCT_TRIO,
  HOMEPAGE_PRODUCT_TRIO_LEAD,
  STUDENT_REQUESTS_LINE,
  VALUE_PROPOSITION,
  GEO_CURRENCY_LINE,
  studentFreeContactsShort,
} from "@/lib/marketing-copy";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { FreeVsPaidHighlights } from "@/components/FreeVsPaidComparison";
import { RecentAndSavedTutors } from "@/components/RecentAndSavedTutors";
import { organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { HeroImagePreload } from "@/components/HeroImagePreload";
import { catalogSubjectNames } from "@/lib/subject-catalog";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Find Expert Private Tutors Online – GCSE, A-Level, IGCSE & IB",
  description: `${VALUE_PROPOSITION} Browse tutors by subject and city. ${GEO_CURRENCY_LINE}`,
  path: "/",
});


export default async function HomePage() {
  const session = await auth();
  const currency = await getVisitorCurrency();
  const headersList = await headers();
  const pinnedCountry = getUserCountry(headersList);
  const region = getVisitorRegion(headersList);
  const curriculumCodeCount = CURRICULUM.length;
  const [listedProfiles, studentCount, openAds, pastPaperCount, featuredRaw, reviews] =
    await Promise.all([
      prisma.tutorProfile.findMany({
        where: publicListedTutorWhere(),
        select: {
          id: true,
          hourlyRate: true,
          headline: true,
          subjects: true,
          verified: true,
          highlighted: true,
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
      }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.studentAd.count({ where: { status: "OPEN" } }),
      prisma.pastPaper.count({ where: publicAvailabilityWhere() }),
      prisma.subjectProfile.findMany({
        where: {
          status: "ACTIVE",
          tutorProfile: publicListedTutorWhere(),
        },
        orderBy: [{ highlightedUntil: "desc" }, { boostUntil: "desc" }, { updatedAt: "desc" }],
        take: 24,
        select: {
          id: true,
          subject: true,
          title: true,
          headline: true,
          rate: true,
          highlightedUntil: true,
          tutorProfile: {
            select: {
              verified: true,
              highlighted: true,
              highlightedUntil: true,
              photoUrl: true,
              photoCropX: true,
              photoCropY: true,
              photoCropZoom: true,
              active: true,
              forceActive: true,
              bio: true,
              country: true,
              location: true,
              subjects: true,
              online: true,
              inPerson: true,
              qualifications: true,
              user: { select: { name: true, emailVerified: true, suspended: true } },
              reviews: { select: { rating: true } },
            },
          },
        },
      }),
      prisma.review.findMany({
        where: {
          status: "PUBLISHED",
          comment: { not: "" },
        },
        take: 3,
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          comment: true,
          rating: true,
          student: { select: { name: true } },
          tutorProfile: {
            select: {
              subjects: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
    ]);

  const publicProfiles = filterCanonicallyPublicTutors(listedProfiles);
  const tutorCount = publicProfiles.length;
  const now = new Date();
  const featured = featuredRaw
    .filter((row) => canViewTutorProfilePublicly(tutorPublicVisibilityInput(row.tutorProfile)))
    .map((row) => {
      const p = row.tutorProfile;
      return {
        id: row.id,
        subject: row.subject,
        headline: row.headline || row.title || p.user.name,
        hourlyRate: row.rate,
        verified: p.verified,
        highlighted: isHighlightActive(row.highlightedUntil || p.highlightedUntil, p.highlighted, now),
        photoUrl: p.photoUrl,
        photoCropX: p.photoCropX,
        photoCropY: p.photoCropY,
        photoCropZoom: p.photoCropZoom,
        user: p.user,
        reviews: p.reviews,
      };
    })
    .slice(0, 3);

  const stats = [
    tutorCount > 0 && {
      value: tutorCount.toLocaleString(),
      label: tutorCount === 1 ? "Active tutor" : "Active tutors",
    },
    studentCount > 0 && {
      value: studentCount.toLocaleString(),
      label: studentCount === 1 ? "Student joined" : "Students joined",
    },
    openAds > 0 && {
      value: openAds.toLocaleString(),
      label: openAds === 1 ? "Open student request" : "Open student requests",
    },
    curriculumCodeCount > 0 && {
      value: curriculumCodeCount.toLocaleString(),
      label: "Curriculum subject codes",
    },
    pastPaperCount > 0 && {
      value: pastPaperCount.toLocaleString(),
      label: pastPaperCount === 1 ? "Past paper" : "Past papers",
    },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <>
      <HeroImagePreload />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organizationJsonLd(), websiteJsonLd()],
        }}
      />
      <section className="hero hero-findtutor">
        <div className="hero-content">
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
          <h1>Private tutoring, elevated.</h1>
          <p className="hero-lead">{VALUE_PROPOSITION}</p>
          <p className="hero-sub">{region.geoCurrencyLine}</p>
          <div className="hero-search-shell">
            <HeroSearch
              placeholder={region.searchPlaceholder}
              suggestedCountry={region.countryName}
              subjects={[...new Set([...POPULAR_SUBJECTS, ...catalogSubjectNames()])].slice(0, 80)}
            />
          </div>
          <RecentAndSavedTutors />
          <HeroPathCards />
          <ValuePropStrip className="hero-value-strip" />
        </div>
      </section>

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

      <PrestigePillars curriculaLine={region.curriculaLine} />

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Free to search. Pay only when you need more.</h2>
              <p className="section-lead">
                Join free as a student or tutor. Upgrade for unlimited messaging, study tools, or
                tutor growth features — lesson fees always stay between you and your tutor.
              </p>
            </div>
            <Link href="/free-vs-paid" className="btn btn-secondary">
              Free vs paid guide
            </Link>
          </div>
          <FreeVsPaidHighlights compact />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>How My Tutoring Hub works</h2>
          <p className="section-lead">Search, contact, and arrange lessons in three clear steps.</p>
          <div className="steps">
            <div className="step">
              <span>1</span>
              <h3>Search</h3>
              <p className="muted">Tell us what you want to learn and pick tutors that fit your needs.</p>
            </div>
            <div className="step">
              <span>2</span>
              <h3>Contact</h3>
              <p className="muted">
                Message tutors free ({studentFreeContactsShort()}) or unlimited with Student Pass. Compare
                replies and pick the best fit.
              </p>
            </div>
            <div className="step">
              <span>3</span>
              <h3>Learn</h3>
              <p className="muted">
                Arrange lessons and pay your tutor directly — keep it personal and flexible.
              </p>
            </div>
          </div>
          <p className="section-actions">
            <Link href="/search" className="btn">
              Find a tutor
            </Link>
          </p>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="section section-stats prestige-stats">
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

      {featured.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Featured tutors</h2>
                <p className="section-lead">Highlighted subject listings students love.</p>
              </div>
              <Link href="/search" className="btn btn-secondary">
                See all tutors
              </Link>
            </div>
            <div className="tutor-grid">
              {featured.map((t) => {
                const avg =
                  t.reviews.length > 0
                    ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                    : null;
                const tutorName = t.user.name?.trim() || "Tutor";
                return (
                  <Link key={t.id} href={listingPath(t.id)} className="tutor-card">
                    <TutorAvatar
                      className="tutor-avatar"
                      photoUrl={t.photoUrl}
                      cropX={t.photoCropX}
                      cropY={t.photoCropY}
                      cropZoom={t.photoCropZoom}
                      initial={tutorName.slice(0, 1).toUpperCase()}
                    />
                    <div>
                      <div className="meta">
                        {t.verified && <span className="badge">Verified</span>}
                        {t.highlighted && <span className="badge accent">Highlighted</span>}
                      </div>
                      <h3>{tutorName}</h3>
                      <p>{t.headline || t.subject}</p>
                      <div className="meta">
                        <span>{formatHourly(t.hourlyRate, currency)}</span>
                        {avg !== null && <span>{avg.toFixed(1)} ★</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <h2>Popular subjects</h2>
          <p className="section-lead">
            School boards, exam prep, languages, and university subjects — online or in person.
          </p>
          <div className="subject-chips">
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

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Post a student request</h2>
              <p className="section-lead">{STUDENT_REQUESTS_LINE}</p>
            </div>
            <Link href="/ads" className="btn btn-secondary">
              Browse requests
            </Link>
          </div>
          <div className="hero-ctas">
            <Link href="/ads/new" className="btn">
              Post what you need
            </Link>
            <Link href="/pricing" className="btn btn-secondary">
              Student Pass
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Top subjects by country</h2>
          <p className="section-lead">
            Popular subjects with codes such as MATH, PHY, and IB-DP-MATH — top markets first, plus
            more countries to browse.
          </p>
          <CountryMarkets compact pinnedCountry={pinnedCountry} />
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>What students say</h2>
            <p className="section-lead">Recent reviews from students on My Tutoring Hub.</p>
            <div className="testimonial-grid">
              {reviews.map((r) => {
                const subject = r.tutorProfile.subjects?.split(",")[0]?.trim();
                return (
                  <blockquote key={r.id} className="testimonial">
                    <p>“{r.comment}”</p>
                    <footer>
                      <strong>{r.student.name}</strong>
                      <span className="muted">
                        {r.rating} ★
                        {subject ? ` · ${subject}` : ""}
                      </span>
                    </footer>
                  </blockquote>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section cta-band">
        <div className="container cta-band-inner">
          <div>
            <h2>Are you a tutor? Start teaching</h2>
            <p>
              Complete your profile to appear in search for free. Tutor Pro adds priority
              ranking, unlimited enquiry reveals, and up to 3 teaching listings — complimentary
              until 30 September 2026 (2 free teaching listings for everyone during the
              launch; more require a plan). From 1 October 2026 listings are paid. Listing Boost
              is optional; the Verified badge is earned via identity review. You keep 100%
              of lesson fees.
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/become-a-tutor" className="btn">
              Become a tutor
            </Link>
          </div>
        </div>
        <InviteTutorShare
          referrerId={session?.user?.id}
          referrerName={session?.user?.name}
          compact
        />
      </section>
    </>
  );
}
