"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  countryChoices,
  parseSearchQuery,
  suggestCities,
  suggestSubjects,
} from "@/lib/search-smart";
import {
  citiesForSearchCountry,
  cityBelongsToCountry,
  inferTutorCountry,
} from "@/lib/tutor-catalog";
import { SuggestField } from "@/components/SuggestField";

export function HeroSearch({
  placeholder,
  suggestedCountry,
  subjects = [],
}: {
  placeholder: string;
  suggestedCountry?: string;
  subjects?: string[];
}) {
  const router = useRouter();
  const countries = useMemo(() => countryChoices(), []);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState(suggestedCountry || "");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("");

  const cityPool = useMemo(
    () => (country ? citiesForSearchCountry(country) : undefined),
    [country],
  );
  const cityOptions = useMemo(() => {
    const limit = country ? Math.min(cityPool?.length ?? 12, 20) : 12;
    return suggestCities(location, limit, cityPool).map((city) => ({
      value: city,
      label: city,
      hint: city === "Online" ? "Video lessons" : undefined,
    }));
  }, [location, cityPool, country]);

  const subjectOptions = useMemo(
    () =>
      suggestSubjects(q, subjects, 6).map((name) => ({
        value: name,
        label: name,
      })),
    [q, subjects],
  );

  function onCountryChange(next: string) {
    setCountry(next);
    if (next && location && location !== "Online" && !cityBelongsToCountry(location, next)) {
      setLocation("");
    }
  }

  function onCityChange(value: string, option?: { value: string }) {
    const next = (option?.value || value).trim();
    setLocation(next);
    if (!next || /^online$/i.test(next)) return;
    // If country is blank, infer it from the city so search stays precise.
    if (!country) {
      const inferred = inferTutorCountry(next);
      if (inferred) setCountry(inferred);
    }
  }

  function goSearch(rawQ: string) {
    const parsed = parseSearchQuery(rawQ);
    const params = new URLSearchParams();
    if (parsed.subject) params.set("subject", parsed.subject);
    const nation = country || parsed.country || inferTutorCountry(location) || "";
    const city = location || parsed.location || "";
    if (nation) params.set("country", nation);
    if (city) params.set("location", city);
    if (parsed.q) params.set("q", parsed.q);
    else if (rawQ.trim() && !parsed.subject && !parsed.location && !parsed.country) {
      params.set("q", rawQ.trim());
    }
    const lessonMode = mode || parsed.mode || "";
    if (lessonMode) params.set("mode", lessonMode);
    router.push(`/search?${params.toString()}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    goSearch(q);
  }

  return (
    <form className="hero-search hero-search--bar" onSubmit={onSubmit}>
      <div className="hero-search-bar" role="group" aria-label="Tutor search">
        <div className="hero-search-field hero-search-field--query">
          <span className="hero-search-field-label" aria-hidden="true">
            Subject
          </span>
          <SuggestField
            name="q"
            label="What do you want to learn?"
            value={q}
            onChange={(value, option) => {
              setQ(option?.value || value);
            }}
            options={subjectOptions}
            placeholder={placeholder}
            hideLabel
          />
        </div>
        <div className="hero-search-field">
          <label className="hero-search-field-label" htmlFor="hero-search-mode">
            Format
          </label>
          <select
            id="hero-search-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            aria-label="Lesson mode"
          >
            <option value="">Any format</option>
            <option value="online">Online</option>
            <option value="inperson">In person</option>
          </select>
        </div>
        <div className="hero-search-field">
          <label className="hero-search-field-label" htmlFor="hero-search-country">
            Country
          </label>
          <select
            id="hero-search-country"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            aria-label="Country"
          >
            <option value="">Any country</option>
            {countries.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="hero-search-field hero-search-field--city">
          <span className="hero-search-field-label" aria-hidden="true">
            City
          </span>
          <SuggestField
            name="location"
            label="City"
            value={location}
            onChange={onCityChange}
            options={cityOptions}
            placeholder="Any city or Online"
            hideLabel
          />
        </div>
        <button className="btn hero-search-submit" type="submit">
          Search tutors
        </button>
      </div>
      <p className="hero-guided-link muted">
        Prefer step-by-step? <Link href="/search?guided=1">Guided search</Link>
      </p>
    </form>
  );
}
