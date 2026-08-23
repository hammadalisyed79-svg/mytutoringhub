/**
 * Homepage streaming fallback — matches `.hero.hero-findtutor` geometry
 * so Suspense replacement does not shove the footer/header siblings in-view.
 * Intentionally not an H1 (final page owns the primary heading).
 */
export function HomeLoading() {
  return (
    <section
      className="hero hero-findtutor home-route-loading"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading homepage"
    >
      <div className="hero-content">
        <div className="hero-brand-row" aria-hidden>
          <span className="home-loading-skel home-loading-skel-mark" />
          <span className="home-loading-skel home-loading-skel-kicker" />
        </div>
        <div className="home-loading-skel home-loading-skel-title" aria-hidden />
        <div className="home-loading-skel home-loading-skel-lead" aria-hidden />
        <div className="home-loading-skel home-loading-skel-sub" aria-hidden />
        <div className="hero-search-shell" aria-hidden>
          <div className="home-loading-skel home-loading-skel-search" />
        </div>
        <div className="home-loading-skel home-loading-skel-paths" aria-hidden />
        <div className="home-loading-skel home-loading-skel-strip" aria-hidden />
      </div>
    </section>
  );
}
