import Link from "next/link";
import { curriculumCountries, groupCurriculumByBoard, CURRICULUM } from "@/lib/curriculum";
import { countryByName } from "@/lib/markets";

export function CurriculumBrowser({
  country,
  query = "",
}: {
  country?: string;
  query?: string;
}) {
  const countries = curriculumCountries();
  const selected =
    countries.find((name) => name.toLowerCase() === (country || "").toLowerCase()) ||
    countries[0] ||
    "Pakistan";
  const groups = groupCurriculumByBoard(selected, query);
  const total = CURRICULUM.filter((row) => row.country === selected).length;
  const shown = groups.reduce((n, g) => n + g.entries.length, 0);
  const city = countryByName(selected)?.cities[0];

  return (
    <div className="curriculum-browser">
      <form className="curriculum-toolbar" action="/subjects" method="get">
        <input type="hidden" name="country" value={selected} />
        <label className="curriculum-search">
          <span className="sr-only">Search subject codes</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search codes, subjects, or boards"
          />
        </label>
        <button type="submit" className="btn btn-secondary btn-sm">
          Search
        </button>
        <p className="muted curriculum-count">
          {shown === total
            ? `${total} subject codes in ${selected}`
            : `${shown} of ${total} subject codes in ${selected}`}
        </p>
      </form>
      <div className="curriculum-countries" role="tablist" aria-label="Countries">
        {countries.map((name) => {
          const href = query
            ? `/subjects?country=${encodeURIComponent(name)}&q=${encodeURIComponent(query)}`
            : `/subjects?country=${encodeURIComponent(name)}`;
          return (
            <Link
              key={name}
              href={href}
              role="tab"
              aria-selected={name === selected}
              className={`chip-btn ${name === selected ? "is-on" : ""}`}
            >
              {name}
            </Link>
          );
        })}
      </div>
      {groups.length === 0 ? (
        <p className="muted">No subject codes match that search.</p>
      ) : (
        groups.map((group) => (
          <section key={group.board} className="curriculum-board">
            <h3>{group.board}</h3>
            <div className="subject-chips country-subject-chips">
              {group.entries.map((row) => (
                <Link
                  key={row.code}
                  href={`/search?subject=${encodeURIComponent(row.subject)}${
                    city ? `&location=${encodeURIComponent(city)}` : ""
                  }&level=${encodeURIComponent(row.level)}`}
                  className="chip"
                  title={`${row.code} · ${row.subject} · ${row.level} · ${row.exam}`}
                >
                  <span className="subject-code">{row.code}</span>
                  <span>
                    {row.subject}
                    <span className="chip-meta"> {row.level}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
