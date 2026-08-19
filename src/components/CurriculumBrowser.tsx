import Link from "next/link";
import { groupCurriculumByBoard, CURRICULUM, splitCurriculumCountries } from "@/lib/curriculum";
import { countryByName } from "@/lib/markets";
import { MoreCountriesSelect } from "@/components/MoreCountriesSelect";

function codesHref(name: string, query: string) {
  const params = new URLSearchParams({ tab: "codes", country: name });
  if (query) params.set("q", query);
  return `/subjects?${params.toString()}`;
}

export function CurriculumBrowser({
  country,
  query = "",
  pinnedCountry,
}: {
  country?: string;
  query?: string;
  pinnedCountry?: string | null;
}) {
  const { featured, rest } = splitCurriculumCountries(pinnedCountry);
  const selected =
    [...featured, ...rest].find((name) => name.toLowerCase() === (country || "").toLowerCase()) ||
    featured[0] ||
    "Pakistan";
  const groups = groupCurriculumByBoard(selected, query);
  const total = CURRICULUM.filter((row) => row.country === selected).length;
  const shown = groups.reduce((n, g) => n + g.entries.length, 0);
  const city = countryByName(selected)?.cities[0];

  return (
    <div className="cb-root">
      <div className="cb-search-wrap">
        <form className="cb-search-form" action="/subjects" method="get">
          <input type="hidden" name="tab" value="codes" />
          <input type="hidden" name="country" value={selected} />
          <div className="cb-search-field">
            <svg className="cb-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.75" />
              <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search codes, subjects, or boards…"
              className="cb-search-input"
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm cb-search-btn">
            Search
          </button>
        </form>
        <p className="cb-count muted">
          {shown === total
            ? `${total.toLocaleString()} subject codes in ${selected}`
            : `${shown.toLocaleString()} of ${total.toLocaleString()} subject codes in ${selected}`}
        </p>
      </div>

      <div className="cb-countries-row">
        <div className="cb-countries-scroll" role="tablist" aria-label="Countries">
          {featured.map((name) => (
            <Link
              key={name}
              href={codesHref(name, query)}
              role="tab"
              aria-selected={name === selected}
              className={`cb-country-pill${name === selected ? " is-active" : ""}`}
            >
              {name}
            </Link>
          ))}
        </div>
        <MoreCountriesSelect
          placeholder="More countries"
          selectedLabel={rest.includes(selected) ? selected : undefined}
          options={rest.map((name) => ({
            label: name,
            href: codesHref(name, query),
          }))}
        />
      </div>

      {groups.length === 0 ? (
        <p className="muted">No subject codes match that search.</p>
      ) : (
        <div className="cb-boards">
          {groups.map((group, i) => (
            <section key={group.board} className="cb-board-card">
              <div className="cb-board-head">
                <h2 className="cb-board-name">{group.board}</h2>
                <span className="cb-board-count">
                  {group.entries.length} subject{group.entries.length !== 1 ? "s" : ""}
                </span>
              </div>
              {i > 0 && <hr className="cb-board-divider" aria-hidden="true" />}
              <div className="cb-chip-grid">
                {group.entries.map((row) => (
                  <Link
                    key={row.code}
                    href={`/search?subject=${encodeURIComponent(row.subject)}${
                      city ? `&country=${encodeURIComponent(selected)}&location=${encodeURIComponent(city)}` : ""
                    }&level=${encodeURIComponent(row.level)}`}
                    className="cb-chip"
                    title={`${row.code} · ${row.subject} · ${row.level} · ${row.exam}`}
                  >
                    <span className="cb-chip-code">{row.code}</span>
                    <span className="cb-chip-name">{row.subject}</span>
                    <span className="cb-chip-level">{row.level}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
