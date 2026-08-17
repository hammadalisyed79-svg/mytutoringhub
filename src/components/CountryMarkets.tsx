import Link from "next/link";
import { TOP_COUNTRIES } from "@/lib/markets";

export function CountryMarkets({ compact = false }: { compact?: boolean }) {
  const countries = compact ? TOP_COUNTRIES.slice(0, 6) : TOP_COUNTRIES;
  return (
    <div className="country-markets">
      {countries.map((country) => (
        <article key={country.code} className="country-market">
          <div className="country-market-head">
            <span className="country-code" title={`ISO country code ${country.code}`}>
              {country.code}
            </span>
            <div>
              <h3>{country.name}</h3>
              <p className="muted">{country.cities.join(" · ")}</p>
            </div>
          </div>
          <div className="subject-chips country-subject-chips">
            {country.subjects.map((subject) => (
              <Link
                key={`${country.code}-${subject}`}
                href={`/search?subject=${encodeURIComponent(subject)}&location=${encodeURIComponent(country.cities[0])}`}
                className="chip"
              >
                {subject}
              </Link>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
