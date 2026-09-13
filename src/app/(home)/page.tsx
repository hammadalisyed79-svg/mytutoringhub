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
} from "@/lib/marketing-copy";
import { BUSINESS, NO_LESSON_COMMISSION_SHORT } from "@/lib/business-rules";
import { RecentAndSavedTutors } from "@/components/RecentAndSavedTutors";
import { organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { catalogSubjectNames } from "@/lib/subject-catalog";

export const dynamic = "force-dynamic";

/** Homepage chips stay short — full directory is on /subjects. */
const HOME_SUBJECT_CHIPS = POPULAR_SUBJECTS.slice(0, 8);

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

      {/* 1. Hero + tutor search */}
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
                Find the right tutor for your subject, exam or goal — online or near you.
              </p>
            </div>
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
              Search free · {BUSINESS.studentFreeContactsPerMonth} contacts/month ·{" "}
              {NO_LESSON_COMMISSION_SHORT}
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

      {/* 2. Three main benefits */}
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
              <span className="muted">Browse free by subject, exam, and location</span>
            </Link>
            <Link href="/past-papers" className="product-trio-card product-trio-card--open">
              <span className="product-trio-index" aria-hidden="true">
                02
              </span>
              <strong>Past papers</strong>
              <span className="muted">Papers by board, year, and session</span>
            </Link>
            <Link href="/assistant" className="product-trio-card product-trio-card--open">
              <span className="product-trio-index" aria-hidden="true">
                03
              </span>
              <strong>Study support</strong>
              <span className="muted">Countdown, progress, and AI tools</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. How MTH works */}
      <section className="section section-alt" aria-labelledby="how-it-works-title">
        <div className="container">
          <h2 id="how-it-works-title">How it works</h2>
          <p className="section-lead">Search → Contact → Learn</p>
          <div className="steps home-steps-connected">
            <div className="step">
              <span>1</span>
              <h3>Search</h3>
              <p className="muted">Find tutors by subject, exam, and location.</p>
            </div>
            <div className="step">
              <span>2</span>
              <h3>Contact</h3>
              <p className="muted">Message tutors when you are ready.</p>
            </div>
            <div className="step">
              <span>3</span>
              <h3>Learn</h3>
              <p className="muted">Arrange lessons and pay your tutor directly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Popular subjects */}
      <section className="section home-popular-subjects" aria-labelledby="popular-subjects-title">
        <div className="container">
          <div className="home-popular-subjects-head">
            <h2 id="popular-subjects-title">Popular subjects</h2>
            <Link href="/subjects" className="home-popular-subjects-all">
              Browse all subjects <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="subject-chips home-subject-chips">
            {HOME_SUBJECT_CHIPS.map((s) => (
              <Link key={s} href={`/search?subject=${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Trust / Why MTH */}
      <PrestigePillars curriculaLine={region.curriculaLine} />

      {/* 6. Past Papers — one strong section */}
      <Suspense fallback={<HomePastPapersFallback />}>
        <HomePastPapersShowcase pinnedCountry={pinnedCountry ?? undefined} />
      </Suspense>

      {/* 7. Simple plan teaser */}
      <section className="section home-free-summary" aria-labelledby="free-summary-title">
        <div className="container">
          <h2 id="free-summary-title">Start free. Upgrade when you need more.</h2>
          <div className="home-free-summary-grid">
            <div>
              <h3>Students</h3>
              <p className="muted">
                Start free · {BUSINESS.studentFreeContactsPerMonth} new tutor contacts/month
              </p>
              <p className="section-actions" style={{ marginTop: "0.75rem" }}>
                <Link href="/pricing?audience=student" className="btn btn-secondary btn-sm">
                  View student plans
                </Link>
              </p>
            </div>
            <div>
              <h3>Tutors</h3>
              <p className="muted">
                List free · {BUSINESS.tutorFreeActiveListings} active Teaching Profile
              </p>
              <p className="section-actions" style={{ marginTop: "0.75rem" }}>
                <Link href="/pricing?audience=tutor" className="btn btn-secondary btn-sm">
                  View tutor plans
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Become a Tutor */}
      <section className="section home-tutor-recruit" aria-labelledby="home-tutor-recruit-title">
        <div className="container home-tutor-recruit-inner">
          <div>
            <h2 id="home-tutor-recruit-title">Teach students worldwide</h2>
            <p className="section-lead">
              Create your profile free. Keep 100% of lesson fees — no commission on lessons.
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/become-a-tutor" className="btn">
              Start teaching
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Markets — compact */}
      <section className="section section-alt home-markets" aria-labelledby="home-markets-title">
        <div className="container">
          <h2 id="home-markets-title">Tutoring markets</h2>
          <p className="section-lead">Popular countries, cities, and subjects.</p>
          <CountryMarkets compact pinnedCountry={pinnedCountry} />
        </div>
      </section>

      {/* 10. Student Request — end of discovery journey */}
      <section className="section home-student-request" aria-labelledby="student-request-title">
        <div className="container home-student-request-inner">
          <div>
            <h2 id="student-request-title">Still can&apos;t find the right tutor?</h2>
            <p className="section-lead">
              Post what you need — matching tutors can reply.
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/ads/new" className="btn btn-secondary">
              Post a request
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Final CTA */}
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
      </section>
    </div>
  );
}
