"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CurriculumCodeOption } from "@/lib/curriculum";
import { subjectCode } from "@/lib/markets";
import {
  SEARCH_LANGUAGES,
  SEARCH_LEVELS,
  countryChoices,
  resolveCity,
  resolveCountry,
  suggestCities,
  suggestSubjects,
} from "@/lib/search-smart";
import {
  citiesForSearchCountry,
  cityBelongsToCountry,
  inferTutorCountry,
} from "@/lib/tutor-catalog";
import { SuggestField, type SuggestOption } from "@/components/SuggestField";

type Props = {
  initial: {
    q?: string;
    subject?: string;
    location?: string;
    country?: string;
    level?: string;
    language?: string;
    mode?: string;
    max?: string;
    verified?: string;
    trial?: string;
  };
  subjects: string[];
  levels: string[];
  codes: CurriculumCodeOption[];
  currency: string;
  pinnedCountry?: string | null;
  searchQueryPlaceholder: string;
  defaultCityPlaceholder: string;
  levelPlaceholder: string;
};

function initialCountryValue(initial: Props["initial"]) {
  const fromParam = resolveCountry(initial.country);
  if (fromParam.matched) return fromParam.value;
  return inferTutorCountry(initial.location, initial.country);
}

export function SearchFiltersForm({
  initial,
  subjects,
  levels,
  codes,
  currency,
  pinnedCountry,
  searchQueryPlaceholder,
  defaultCityPlaceholder,
  levelPlaceholder,
}: Props) {
  const countries = useMemo(() => {
    const all = countryChoices();
    if (!pinnedCountry) return all;
    return [pinnedCountry, ...all.filter((c) => c !== pinnedCountry)];
  }, [pinnedCountry]);
  const [q, setQ] = useState(initial.q || "");
  const [subject, setSubject] = useState(initial.subject || "");
  const [country, setCountry] = useState(initialCountryValue(initial));
  const [location, setLocation] = useState(initial.location || "");
  const [level, setLevel] = useState(initial.level || "");
  const [language, setLanguage] = useState(initial.language || "");
  const [applying, setApplying] = useState(false);

  const cityPool = useMemo(
    () => (country ? citiesForSearchCountry(country) : undefined),
    [country],
  );

  const subjectOptions = useMemo(() => {
    const names = suggestSubjects(subject, subjects, 8);
    const fromNames: SuggestOption[] = names.map((name) => ({
      value: name,
      label: name,
      hint: subjectCode(name),
    }));
    const needle = subject.trim().toLowerCase();
    if (needle.length < 2) return fromNames;
    const fromCodes: SuggestOption[] = codes
      .filter((row) => {
        const hay = `${row.code} ${row.subject} ${row.board} ${row.level}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 6)
      .map((row) => ({
        value: row.subject,
        label: row.code,
        hint: `${row.subject} · ${row.level}`,
      }));
    const seen = new Set(fromNames.map((o) => o.label.toLowerCase()));
    return [...fromNames, ...fromCodes.filter((o) => !seen.has(o.label.toLowerCase()))].slice(0, 10);
  }, [subject, subjects, codes]);

  const cityOptions = useMemo(() => {
    // Keep suggestion scoring fast even if a country has many cities.
    const limit = Math.min(cityPool?.length ?? 8, 20);
    return suggestCities(location, limit, cityPool).map((city) => ({
      value: city,
      label: city,
      hint: city === "Online" ? "Video lessons" : undefined,
    }));
  }, [location, cityPool]);

  const levelOptions = useMemo(() => {
    const all = [...new Set([...SEARCH_LEVELS, ...levels])];
    const needle = level.trim().toLowerCase();
    const filtered = needle ? all.filter((item) => item.toLowerCase().includes(needle)) : all;
    return filtered.slice(0, 8).map((item) => ({ value: item, label: item }));
  }, [level, levels]);

  const languageOptions = useMemo(() => {
    const needle = language.trim().toLowerCase();
    const filtered = needle
      ? SEARCH_LANGUAGES.filter((item) => item.toLowerCase().includes(needle))
      : SEARCH_LANGUAGES;
    return filtered.slice(0, 8).map((item) => ({ value: item, label: item }));
  }, [language]);

  const cityPlaceholder = country
    ? `${(cityPool || []).find((city) => city !== "Online") || "City"}, Online…`
    : defaultCityPlaceholder;

  function onCountryChange(next: string) {
    setCountry(next);
    if (next && location && !cityBelongsToCountry(location, next)) {
      setLocation("");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const city = resolveCity(location, cityPool);
    const nation = resolveCountry(country);
    if (
      (!city.matched || city.value === location) &&
      (!nation.matched || nation.value === country)
    ) {
      return;
    }
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (nation.matched) data.set("country", nation.value);
    if (city.matched) data.set("location", city.value);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }
    setApplying(true);
    window.setTimeout(() => {
      window.location.assign(`/search?${params.toString()}`);
    }, 240);
  }

  const active = [
    q && { key: "q", label: `“${q}”` },
    subject && { key: "subject", label: subject },
    country && { key: "country", label: resolveCountry(country).label || country },
    location && { key: "location", label: resolveCity(location, cityPool).label || location },
    level && { key: "level", label: level },
    language && { key: "language", label: language },
    initial.mode === "online" && { key: "mode", label: "Online" },
    initial.mode === "inperson" && { key: "mode", label: "In person" },
    initial.verified === "1" && { key: "verified", label: "Verified" },
    initial.trial === "1" && { key: "trial", label: "Free trial" },
    initial.max && { key: "max", label: `Up to ${initial.max} ${currency}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const moreFiltersActive = Boolean(
    level ||
      language ||
      initial.mode ||
      initial.max ||
      initial.verified === "1" ||
      initial.trial === "1",
  );

  const [moreOpen, setMoreOpen] = useState(moreFiltersActive);

  return (
    <form
      className={`search-panel${applying ? " search-panel--applying" : ""}`}
      method="get"
      action="/search"
      onSubmit={onSubmit}
    >
      <div className="search-primary">
        <label className="search-q">
          <span>Search</span>
          <input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchQueryPlaceholder}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </label>
        <button className={`btn${applying ? " btn--pulse" : ""}`} type="submit" disabled={applying}>
          {applying ? "Searching…" : "Find tutors"}
        </button>
      </div>

      <div className="search-grid search-grid-core">
        <SuggestField
          name="subject"
          label="Subject"
          value={subject}
          onChange={(value, option) => {
            setSubject(value);
            if (option?.hint?.includes(" · ")) {
              const lvl = option.hint.split(" · ").pop();
              if (lvl) setLevel(lvl);
            }
          }}
          options={subjectOptions}
          placeholder="Mathematics, Arabic, MATH…"
        />
        <label>
          Country
          <select
            name="country"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
          >
            <option value="">Any country</option>
            {countries.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <SuggestField
          name="location"
          label="City"
          value={location}
          onChange={setLocation}
          options={cityOptions}
          placeholder={cityPlaceholder}
        />
      </div>

      <details
        className="search-more-filters"
        open={moreOpen}
        onToggle={(e) => setMoreOpen(e.currentTarget.open)}
      >
        <summary>More filters</summary>
        <div className="search-grid search-grid-more">
          <SuggestField
            name="level"
            label="Level"
            value={level}
            onChange={setLevel}
            options={levelOptions}
            placeholder={levelPlaceholder}
          />
          <SuggestField
            name="language"
            label="Language"
            value={language}
            onChange={setLanguage}
            options={languageOptions}
            placeholder="English, Urdu…"
          />
          <label>
            Format
            <select name="mode" defaultValue={initial.mode || ""}>
              <option value="">Online or in person</option>
              <option value="online">Online</option>
              <option value="inperson">In person / home</option>
            </select>
          </label>
          <label>
            Max hourly rate ({currency})
            <input
              name="max"
              type="number"
              min={1}
              step="any"
              inputMode="decimal"
              defaultValue={initial.max || ""}
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="search-tools">
          <label className="radio">
            <input
              type="checkbox"
              name="verified"
              value="1"
              defaultChecked={initial.verified === "1"}
            />
            Verified tutors
          </label>
          <label className="radio">
            <input type="checkbox" name="trial" value="1" defaultChecked={initial.trial === "1"} />
            Free trial offered
          </label>
          <Link href="/search" className="search-clear">
            Clear all
          </Link>
        </div>
      </details>

      {active.length > 0 && (
        <div className="search-chips" aria-label="Active filters">
          {active.map((item) => (
            <span key={item.key} className="search-chip">
              {item.label}
            </span>
          ))}
        </div>
      )}
    </form>
  );
}
