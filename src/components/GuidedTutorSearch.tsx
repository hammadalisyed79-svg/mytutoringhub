"use client";

import { useMemo, useState } from "react";
import type { CurriculumCodeOption } from "@/lib/curriculum";
import { subjectCode } from "@/lib/markets";
import { countryChoices, resolveCity, resolveCountry, suggestCities, suggestSubjects } from "@/lib/search-smart";
import { citiesForSearchCountry, cityBelongsToCountry } from "@/lib/tutor-catalog";
import { SuggestField, type SuggestOption } from "@/components/SuggestField";

type Props = {
  subjects: string[];
  codes: CurriculumCodeOption[];
  pinnedCountry?: string | null;
  cityPlaceholder: string;
  initial?: {
    subject?: string;
    country?: string;
    location?: string;
    mode?: string;
    level?: string;
  };
};

const STEPS = [
  { id: "subject", title: "What do you want to learn?", hint: "Type a subject or syllabus code" },
  { id: "place", title: "Where should lessons happen?", hint: "Pick a country, then a city — or stay online" },
  { id: "format", title: "Online or in person?", hint: "You can change this later" },
] as const;

export function GuidedTutorSearch({
  subjects,
  codes,
  pinnedCountry,
  cityPlaceholder,
  initial,
}: Props) {
  const countries = useMemo(() => {
    const all = countryChoices();
    if (!pinnedCountry) return all;
    return [pinnedCountry, ...all.filter((c) => c !== pinnedCountry)];
  }, [pinnedCountry]);

  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState(initial?.subject || "");
  const [level, setLevel] = useState(initial?.level || "");
  const [country, setCountry] = useState(initial?.country || pinnedCountry || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [mode, setMode] = useState(initial?.mode || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    const limit = Math.min(cityPool?.length ?? 8, 20);
    return suggestCities(location, limit, cityPool).map((city) => ({
      value: city,
      label: city,
      hint: city === "Online" ? "Video lessons" : undefined,
    }));
  }, [location, cityPool]);

  function onCountryChange(next: string) {
    setCountry(next);
    if (next && location && !cityBelongsToCountry(location, next)) {
      setLocation("");
    }
  }

  function goNext() {
    setError("");
    if (step === 0 && !subject.trim()) {
      setError("Enter a subject to continue — e.g. Chemistry or Mathematics.");
      return;
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    submit();
  }

  function submit(opts?: { skipFormat?: boolean }) {
    const nation = resolveCountry(country);
    const city = resolveCity(location, cityPool);
    const params = new URLSearchParams();
    if (subject.trim()) params.set("subject", subject.trim());
    if (level.trim()) params.set("level", level.trim());
    if (nation.matched) params.set("country", nation.value);
    else if (country.trim()) params.set("country", country.trim());
    if (city.matched) params.set("location", city.value);
    else if (location.trim()) params.set("location", location.trim());
    const lessonMode = opts?.skipFormat ? "" : mode;
    if (lessonMode) params.set("mode", lessonMode);
    setSubmitting(true);
    window.location.assign(`/search?${params.toString()}`);
  }

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <section className="guided-search panel" aria-labelledby="guided-search-title">
      <div className="guided-search-progress" aria-hidden="true">
        <div className="guided-search-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="guided-search-step muted">
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 id="guided-search-title" className="guided-search-title">
        {current.title}
      </h2>
      <p className="muted guided-search-hint">{current.hint}</p>

      {step === 0 && (
        <div className="guided-search-body">
          <SuggestField
            name="subject"
            label="Subject"
            value={subject}
            onChange={(value, option) => {
              setSubject(value);
              setError("");
              if (option?.hint?.includes(" · ")) {
                const lvl = option.hint.split(" · ").pop();
                if (lvl) setLevel(lvl);
              }
            }}
            options={subjectOptions}
            placeholder="Mathematics, Chemistry, 0620…"
          />
          {level ? <p className="muted guided-search-meta">Level: {level}</p> : null}
        </div>
      )}

      {step === 1 && (
        <div className="guided-search-body guided-search-place">
          <label>
            Country
            <select value={country} onChange={(e) => onCountryChange(e.target.value)}>
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
            placeholder={
              country
                ? `${(cityPool || []).find((c) => c !== "Online") || "City"}, Online…`
                : cityPlaceholder
            }
          />
        </div>
      )}

      {step === 2 && (
        <div className="guided-search-body guided-search-format" role="group" aria-label="Lesson format">
          {[
            { value: "", label: "Either", desc: "Online and in person" },
            { value: "online", label: "Online", desc: "Video lessons" },
            { value: "inperson", label: "In person", desc: "Home or nearby" },
          ].map((option) => (
            <button
              key={option.value || "either"}
              type="button"
              className={`guided-format-card${mode === option.value ? " is-selected" : ""}`}
              onClick={() => setMode(option.value)}
            >
              <strong>{option.label}</strong>
              <span className="muted">{option.desc}</span>
            </button>
          ))}
        </div>
      )}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="guided-search-actions">
        {step > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        ) : (
          <a href="/search?browse=1" className="btn btn-secondary">
            Skip — browse all
          </a>
        )}
        <button type="button" className="btn" onClick={goNext} disabled={submitting}>
          {submitting ? "Searching…" : step === STEPS.length - 1 ? "Show tutors" : "Next"}
        </button>
      </div>

      {step === 2 ? (
        <p className="muted guided-search-skip">
          <button type="button" className="linkish" onClick={() => submit({ skipFormat: true })}>
            Skip format and show tutors
          </button>
        </p>
      ) : null}
    </section>
  );
}
