"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { countryChoices, parseSearchQuery } from "@/lib/search-smart";
import { citiesForSearchCountry, cityBelongsToCountry } from "@/lib/tutor-catalog";

export function HeroSearch() {
  const router = useRouter();
  const countries = useMemo(() => countryChoices(), []);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("");

  const cities = useMemo(() => (country ? citiesForSearchCountry(country) : ["Online"]), [country]);

  function onCountryChange(next: string) {
    setCountry(next);
    if (next && location && !cityBelongsToCountry(location, next)) {
      setLocation("");
    }
    if (!next && location !== "Online") {
      setLocation("");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseSearchQuery(q);
    const params = new URLSearchParams();
    if (parsed.subject) params.set("subject", parsed.subject);
    const nation = country || parsed.country || "";
    const city = location || parsed.location || "";
    if (nation) params.set("country", nation);
    if (city) params.set("location", city);
    if (parsed.q) params.set("q", parsed.q);
    else if (q.trim() && !parsed.subject && !parsed.location && !parsed.country) params.set("q", q.trim());
    const lessonMode = mode || parsed.mode || "";
    if (lessonMode) params.set("mode", lessonMode);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form className="hero-search" onSubmit={onSubmit}>
      <div className="hero-search-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Maths Islamabad, IELTS online, FBISE-HSSC-MATH…"
          aria-label="Search subject, city, or subject code"
          autoComplete="off"
          spellCheck={false}
        />
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
      </div>
      <div className="hero-intent">
        <a href="/register?role=student">I&apos;m looking for a tutor</a>
        <span aria-hidden>·</span>
        <a href="/register?role=tutor">I want to teach</a>
        <span aria-hidden>·</span>
        <a href="/ads">Browse student requests</a>
      </div>
    </form>
  );
}
