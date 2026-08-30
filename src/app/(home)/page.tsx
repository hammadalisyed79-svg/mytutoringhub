import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HeroSearch } from "@/components/HeroSearch";
import { HomePastPapersFallback, HomePastPapersShowcase } from "@/components/HomePastPapersShowcase";
import { HomeProofStrip } from "@/components/HomeProofStrip";
import { PrestigePillars } from "@/components/PrestigePillars";
import { LoggedInWelcome } from "@/components/LoggedInWelcome";
import { LogoMark } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { POPULAR_SUBJECTS } from "@/lib/marketing";
import { CountryMarkets } from "@/components/CountryMarkets";
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
          <div className="hero-clean-top">
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
            <nav className="hero-bookmarks" aria-label="Start here">
              <Link href="/search" className="hero-bookmark">
                Find a tutor
              </Link>
              <Link href="/past-papers" className="hero-bookmark">
                Browse past papers
              </Link>
              <Link href="/assistant" className="hero-bookmark">
                Study with tools
              </Link>
            </nav>
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

      <Suspense fallback={null}>
        <HomeProofStrip />
      </Suspense>

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

      <section className="section home-popular-subjects" aria-labelledby="popular-subjects-title">
        <div className="container">
          <p className="eyebrow">Start with a subject</p>
          <div className="home-popular-subjects-head">
            <h2 id="popular-subjects-title">Popular subjects</h2>
            <Link href="/subjects" className="home-popular-subjects-all">
              Browse all subjects <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="section-lead">High-demand subjects across school, exams, and university.</p>
          <div className="subject-chips home-subject-chips">
            {POPULAR_SUBJECTS.map((s) => (
              <Link key={s} href={`/search?subject=${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={<HomePastPapersFallback />}>
        <HomePastPapersShowcase pinnedCountry={pinnedCountry ?? undefined} />
      </Suspense>

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
