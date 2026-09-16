import Link from "next/link";
import { type MarketCountry, selectFeaturedMarketCountries, subjectCode } from "@/lib/markets";
import { uniqueSubjectsForCountry } from "@/lib/curriculum";
import { MoreCountriesSelect } from "@/components/MoreCountriesSelect";
import { slugify } from "@/lib/search-tutors";

const CHIP_SLOTS = 12;
const COMPACT_CITY_SLOTS = 4;
const COMPACT_CHIP_SLOTS = 4;

/** Indexable country hub (filters on /search stay noindex). */
function countryHubHref(country: MarketCountry) {
  return `/countries/${country.code.toLowerCase()}`;
}

function CountryMarketCard({
  country,
  compact,
}: {
  country: MarketCountry;
  compact?: boolean;
}) {
  const catalog = uniqueSubjectsForCountry(country.name);
  const chipLimit = compact ? COMPACT_CHIP_SLOTS : CHIP_SLOTS;
  const cityLimit = compact ? COMPACT_CITY_SLOTS : 3;
  const subjects = (catalog.length ? catalog : country.subjects).slice(0, chipLimit);
  const cities = country.cities.slice(0, cityLimit);

  return (
    <article className={`country-market${compact ? " country-market--compact" : ""}`}>
      <div className="country-market-head">
        <div>
          <h3>
            <Link href={countryHubHref(country)}>{country.name}</Link>
          </h3>
          <p className="muted">
            {cities.map((c, i) => (
              <span key={c}>
                <Link
                  href={`/search?country=${encodeURIComponent(country.name)}&location=${encodeURIComponent(c)}`}
                  className="city-chip-link"
                >
                  {c}
                </Link>
                {i < cities.length - 1 && " · "}
              </span>
            ))}
            {!compact && country.cities.length > 3 && (
              <>
                {" "}
                <Link href={countryHubHref(country)} className="city-more-link">
                  +{country.cities.length - 3} more — country hub →
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="subject-chips country-subject-chips">
        {subjects.map((subject) => (
          <Link
            key={`${country.code}-${subject}`}
            href={`/s/${slugify(subject)}`}
            className="chip"
            title={`${subjectCode(subject)} · ${subject}`}
          >
            {!compact && <span className="subject-code">{subjectCode(subject)}</span>}
            <span className="chip-text">{subject}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function CountryMarkets({
  compact,
  pinnedCountry,
  moreCountryHref,
}: {
  compact?: boolean;
  pinnedCountry?: string | null;
  moreCountryHref?: (country: MarketCountry) => string;
}) {
  const { featured, rest } = selectFeaturedMarketCountries(pinnedCountry, { compact: !!compact });

  return (
    <>
      <div className={`country-markets${compact ? " country-markets--compact" : ""}`}>
        {featured.map((country) => (
          <CountryMarketCard key={country.code} country={country} compact={compact} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className={`country-more${compact ? " country-more--compact" : ""}`}>
          {compact ? (
            <>
              <p className="muted country-more-lead">
                Explore all countries — browse {rest.length + featured.length}+ tutoring markets.
              </p>
              <div className="country-more-actions">
                <Link href="/subjects" className="btn btn-secondary">
                  Browse 50+ markets
                </Link>
                <MoreCountriesSelect
                  placeholder="Jump to a country"
                  options={rest.map((country) => ({
                    label: country.name,
                    href: moreCountryHref ? moreCountryHref(country) : countryHubHref(country),
                  }))}
                />
              </div>
            </>
          ) : (
            <>
              <h3 className="country-more-title">More countries</h3>
              <p className="muted country-more-lead">
                {rest.length} more markets. Choose one to open that country’s tutor hub.
              </p>
              <MoreCountriesSelect
                placeholder="More countries"
                options={rest.map((country) => ({
                  label: country.name,
                  href: moreCountryHref ? moreCountryHref(country) : countryHubHref(country),
                }))}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

