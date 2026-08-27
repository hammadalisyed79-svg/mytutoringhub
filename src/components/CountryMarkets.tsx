import Link from "next/link";
import { type MarketCountry, selectFeaturedMarketCountries, subjectCode } from "@/lib/markets";
import { uniqueSubjectsForCountry } from "@/lib/curriculum";
import { MoreCountriesSelect } from "@/components/MoreCountriesSelect";

const CHIP_SLOTS = 12;

function searchHref(country: MarketCountry) {
  const city = country.cities[0];
  const params = new URLSearchParams({ country: country.name });
  if (city) params.set("location", city);
  return `/search?${params.toString()}`;
}

function CountryMarketCard({ country }: { country: MarketCountry }) {
  const catalog = uniqueSubjectsForCountry(country.name);
  const subjects = (catalog.length ? catalog : country.subjects).slice(0, CHIP_SLOTS);
  const city = country.cities[0];

  return (
    <article className="country-market">
      <div className="country-market-head">
        <div>
          <h3>{country.name}</h3>
          <p className="muted">
            {country.cities.slice(0, 3).map((c, i) => (
              <span key={c}>
                <Link
                  href={`/search?country=${encodeURIComponent(country.name)}&location=${encodeURIComponent(c)}`}
                  className="city-chip-link"
                >
                  {c}
                </Link>
                {i < Math.min(2, country.cities.length - 1) && " · "}
              </span>
            ))}
            {country.cities.length > 3 && (
              <>
                {" "}
                <Link
                  href={`/search?country=${encodeURIComponent(country.name)}`}
                  className="city-more-link"
                >
                  +{country.cities.length - 3} more cities — search →
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
            href={`/search?subject=${encodeURIComponent(subject)}&country=${encodeURIComponent(country.name)}${
              city ? `&location=${encodeURIComponent(city)}` : ""
            }`}
            className="chip"
            title={`${subjectCode(subject)} · ${subject}`}
          >
            <span className="subject-code">{subjectCode(subject)}</span>
            <span className="chip-text">{subject}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function CountryMarkets({
  pinnedCountry,
  moreCountryHref,
}: {
  compact?: boolean;
  pinnedCountry?: string | null;
  moreCountryHref?: (country: MarketCountry) => string;
}) {
  const { featured, rest } = selectFeaturedMarketCountries(pinnedCountry);

  return (
    <>
      <div className="country-markets">
        {featured.map((country) => (
          <CountryMarketCard key={country.code} country={country} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="country-more">
          <h3 className="country-more-title">More countries</h3>
          <p className="muted country-more-lead">
            {rest.length} more markets. Choose one to open tutor search for that country.
          </p>
          <MoreCountriesSelect
            placeholder="More countries"
            options={rest.map((country) => ({
              label: country.name,
              href: moreCountryHref ? moreCountryHref(country) : searchHref(country),
            }))}
          />
        </div>
      )}
    </>
  );
}
