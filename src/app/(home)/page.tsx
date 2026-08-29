import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeroSearch } from "@/components/HeroSearch";
import { PrestigePillars } from "@/components/PrestigePillars";
import { LoggedInWelcome } from "@/components/LoggedInWelcome";
import { LogoMark } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { POPULAR_SUBJECTS } from "@/lib/marketing";
import { CURRICULUM } from "@/lib/curriculum";
import { CountryMarkets } from "@/components/CountryMarkets";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";
import { buildPastPaperFilterTree } from "@/lib/past-papers/browse";
import { curriculumCountries } from "@/lib/curriculum";
import { PastPaperSearchForm } from "@/components/PastPaperSearchForm";
import { getUserCountry } from "@/lib/geo";
import { getVisitorRegion } from "@/lib/visitor-region";
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

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Find Expert Private Tutors Online – GCSE, A-Level, IGCSE & IB",
  description: `${VALUE_PROPOSITION} Browse tutors by subject and city. ${GEO_CURRENCY_LINE}`,
  path: "/",
});

export default async function HomePage() {
  const session = await auth();
  const headersList = await headers();
  const pinnedCountry = getUserCountry(headersList);
  const region = getVisitorRegion(headersList);
  const curriculumCodeCount = CURRICULUM.length;
  const countries = curriculumCountries(pinnedCountry);
  const [pastPaperCount, boardCountRows] = await Promise.all([
    prisma.pastPaper.count({ where: publicAvailabilityWhere() }),
    prisma.pastPaper.groupBy({
      by: ["board", "country"],
      where: publicAvailabilityWhere(),
      _count: { _all: true },
    }),
  ]);
  const boardCountsByCountry = new Map<string, Map<string, number>>();
  for (const row of boardCountRows) {
    if (!row.country) continue;
    const bucket = boardCountsByCountry.get(row.country) || new Map<string, number>();
    bucket.set(row.board, (bucket.get(row.board) || 0) + row._count._all);
    boardCountsByCountry.set(row.country, bucket);
  }
  const pastPaperFilterTree = buildPastPaperFilterTree(countries, boardCountsByCountry);

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

      {/*
        Hero is search-first only. Floating tutor / past-paper product cards were
        removed — they cluttered the first viewport; tutors live on /search.
      */}
      <section className="hero hero-findtutor hero-split hero-clean" aria-labelledby="home-hero-title">
        <div className="container hero-content hero-split-inner">
          <div className="hero-clean-copy">
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
              Find the right tutor for your subject, exam or goal — online or near you. Search free;
              sign in to contact a tutor.
            </p>
          </div>

          <div className="hero-search-shell">
            <HeroSearch
              placeholder={region.searchPlaceholder}
              suggestedCountry={region.countryName}
              subjects={[...new Set([...POPULAR_SUBJECTS, ...catalogSubjectNames()])].slice(0, 80)}
            />
          </div>

          <div className="hero-split-foot">
            <p className="hero-microcopy">
              {BUSINESS.studentFreeContactsPerMonth} tutor contacts/month free ·{" "}
              {NO_LESSON_COMMISSION_SHORT}
            </p>
            <p className="hero-teach-link">
              Looking to teach? <Link href="/become-a-tutor">Become a tutor →</Link>
            </p>
          </div>
        </div>
      </section>

      <RecentAndSavedTutors
        className="container home-continue-rail"
        recentHeading="Continue where you left off"
      />

      <section className="home-proof-strip" aria-label="Platform facts">
        <div className="container home-proof-strip-inner">
          {stats.map((stat) => (
            <p key={stat.label} className="home-proof-item">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </p>
          ))}
          <p className="home-proof-item home-proof-item--text">
            <span>{NO_LESSON_COMMISSION_SHORT}</span>
          </p>
          <p className="home-proof-item home-proof-item--text">
            <span>
              {BUSINESS.studentFreeContactsPerMonth} free tutor contacts / month
            </span>
          </p>
        </div>
      </section>

      <section className="section product-trio-section" aria-labelledby="product-trio-title">
        <div className="container">
          <h2 id="product-trio-title" className="product-trio-title">
            {HOMEPAGE_PRODUCT_TRIO}
          </h2>
          <p className="section-lead">{HOMEPAGE_PRODUCT_TRIO_LEAD}</p>
          <div className="product-trio-grid product-trio-grid--open">
            <Link href="/search" className="product-trio-card product-trio-card--open">
              <span className="product-trio-index" aria-hidden="true">
                01
              </span>
              <strong>Find tutors</strong>
              <span className="muted">Browse free · 3 new contacts/month included</span>
            </Link>
            <Link href="/past-papers" className="product-trio-card product-trio-card--open">
              <span className="product-trio-index" aria-hidden="true">
                02
              </span>
              <strong>Past papers</strong>
              <span className="muted">Exam papers by board, year, and session</span>
            </Link>
            <Link href="/assistant" className="product-trio-card product-trio-card--open">
              <span className="product-trio-index" aria-hidden="true">
                03
              </span>
              <strong>Study support</strong>
              <span className="muted">Countdown, progress logs, and AI assistant</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="how-it-works-title">
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

      <section className="section" aria-labelledby="popular-subjects-title">
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
            <div className="home-past-papers-preview">
              <p className="home-pp-preview-label" id="home-pp-filter-title">
                Filter past papers
              </p>
              <PastPaperSearchForm
                tree={pastPaperFilterTree}
                pinnedCountry={pinnedCountry}
                action="/past-papers"
                compact
                initial={{}}
              />
            </div>
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

      <section className="section home-free-summary" aria-labelledby="free-summary-title">
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

      <section className="section home-tutor-recruit" aria-labelledby="home-tutor-recruit-title">
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
