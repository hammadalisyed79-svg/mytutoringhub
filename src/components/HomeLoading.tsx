/**
 * Homepage streaming fallback — matches clean search-first hero geometry.
 * Intentionally not an H1 (final page owns the primary heading).
 */
export function HomeLoading() {
  return (
    <section
      className="hero hero-findtutor hero-split hero-clean home-route-loading"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading homepage"
    >
      <div className="container hero-content hero-split-inner">
        <div className="hero-clean-copy">
          <div className="hero-brand-row" aria-hidden>
            <span className="home-loading-skel home-loading-skel-mark" />
            <span className="home-loading-skel home-loading-skel-kicker" />
          </div>
          <div className="home-loading-skel home-loading-skel-title" aria-hidden />
          <div className="home-loading-skel home-loading-skel-lead" aria-hidden />
        </div>
        <div className="hero-search-shell" aria-hidden>
          <div className="home-loading-skel home-loading-skel-search" />
        </div>
        <div className="hero-split-foot" aria-hidden>
          <div className="home-loading-skel home-loading-skel-strip" />
        </div>
      </div>
    </section>
  );
}
