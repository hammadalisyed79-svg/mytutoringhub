"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { countryChoices, parseSearchQuery, suggestSubjects } from "@/lib/search-smart";
import { citiesForSearchCountry, cityBelongsToCountry } from "@/lib/tutor-catalog";
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

  const cities = useMemo(() => (country ? citiesForSearchCountry(country) : ["Online"]), [country]);
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
    if (next && location && !cityBelongsToCountry(location, next)) {
      setLocation("");
    }
    if (!next && location !== "Online") {
      setLocation("");
    }
  }

  function goSearch(rawQ: string) {
    const parsed = parseSearchQuery(rawQ);
    const params = new URLSearchParams();
    if (parsed.subject) params.set("subject", parsed.subject);
    const nation = country || parsed.country || "";
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
    <form className="hero-search" onSubmit={onSubmit}>
      <div className="hero-search-row">
        <div className="hero-search-suggest">
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
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Lesson mode">
          <option value="">Any format</option>
          <option value="online">Online</option>
          <option value="inperson">In person</option>
        </select>
        <button className="btn" type="submit">
          Search tutors
        </button>
      </div>
      <div className="hero-search-place">
        <label>
          <span>Country</span>
          <select value={country} onChange={(e) => onCountryChange(e.target.value)} aria-label="Country">
            <option value="">Any country</option>
            {countries.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>City</span>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            aria-label="City"
          >
            <option value="">{country ? "Any city" : "Select a country first"}</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <p className="hero-guided-link muted">
          Prefer step-by-step?{" "}
          <Link href="/search?guided=1">Guided search</Link>
        </p>
      </div>
    </form>
  );
}
