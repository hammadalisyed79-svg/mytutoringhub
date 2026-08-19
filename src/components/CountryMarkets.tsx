"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TOP_COUNTRIES,
  type MarketCountry,
  homepageFeaturedCountries,
  otherMarketCountries,
  subjectCode,
  countryByName,
} from "@/lib/markets";
import { uniqueSubjectsForCountry } from "@/lib/curriculum";

function CountryMarketCard({
  country,
  compact = false,
}: {
  country: MarketCountry;
  compact?: boolean;
}) {
  const catalog = uniqueSubjectsForCountry(country.name);
  const subjects = (catalog.length ? catalog : country.subjects).slice(0, compact ? 12 : 16);
  const city = countryByName(country.name)?.cities[0] || country.cities[0];

  return (
    <article className="country-market">
      <div className="country-market-head">
        <div>
          <h3>{country.name}</h3>
          <p className="muted">{country.cities.join(" · ")}</p>
        </div>
      </div>
      <div className="subject-chips country-subject-chips">
        {subjects.map((subject) => (
          <Link
            key={`${country.code}-${subject}`}
            href={`/search?subject=${encodeURIComponent(subject)}&location=${encodeURIComponent(city)}`}
            className="chip"
            title={`${subjectCode(subject)} · ${subject}`}
          >
            <span className="subject-code">{subjectCode(subject)}</span>
            {subject}
          </Link>
        ))}
      </div>
    </article>
  );
}

export function CountryMarkets({ compact = false }: { compact?: boolean }) {
  const featured = compact ? homepageFeaturedCountries() : TOP_COUNTRIES;
  const rest = compact ? otherMarketCountries() : [];
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState("");

  const filteredRest = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rest;
    return rest.filter(
      (country) =>
        country.name.toLowerCase().includes(needle) ||
        country.cities.some((city) => city.toLowerCase().includes(needle)),
    );
  }, [query, rest]);

  const selectedCountry = useMemo(
    () => rest.find((country) => country.code === selectedCode) || null,
    [rest, selectedCode],
  );

  return (
    <>
      <div className="country-markets">
        {featured.map((country) => (
          <CountryMarketCard key={country.code} country={country} compact={compact} />
        ))}
      </div>

      {compact && rest.length > 0 && (
        <div className="country-more">
          <h3 className="country-more-title">Browse {rest.length} more countries</h3>
          <p className="muted country-more-lead">
            Search by country or city, then pick one to see popular subjects and tutor search links.
          </p>
          <input
            type="search"
            className="country-more-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries…"
            aria-label="Search countries"
          />
          <div className="country-more-list" role="listbox" aria-label="More countries">
            {filteredRest.length === 0 ? (
              <p className="muted">No countries match your search.</p>
            ) : (
              filteredRest.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  role="option"
                  aria-selected={selectedCode === country.code}
                  className={`chip-btn ${selectedCode === country.code ? "is-on" : ""}`}
                  onClick={() => setSelectedCode(country.code)}
                >
                  {country.name}
                </button>
              ))
            )}
          </div>
          {selectedCountry && (
            <div className="country-more-selected">
              <CountryMarketCard country={selectedCountry} compact />
            </div>
          )}
        </div>
      )}
    </>
  );
}
