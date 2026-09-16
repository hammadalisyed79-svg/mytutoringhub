import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { HeroSearch } from "@/components/HeroSearch";
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
              <span className="muted">Countdown, progress, and AI tools (Pro)</span>
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <HomeProofStrip />
      </Suspense>

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

      <PrestigePillars curriculaLine={region.curriculaLine} />

      <section className="section section-alt home-markets" aria-labelledby="home-markets-title">
        <div className="container">
          <h2 id="home-markets-title">Tutoring markets</h2>
          <p className="section-lead">Popular countries, cities, and subjects.</p>
          <CountryMarkets compact pinnedCountry={pinnedCountry} />
        </div>
      </section>

      <section className="section cta-band">
        <div className="container cta-band-inner">
          <div>
            <h2>Ready to start?</h2>
            <p>
              Find a tutor free, post a request, or create your profile and teach worldwide — no
              commission on lesson fees.
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/search" className="btn">
              Find a tutor
            </Link>
            <Link href="/ads/new" className="btn btn-secondary">
              Post a request
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
