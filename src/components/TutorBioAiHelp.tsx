"use client";

import { useState } from "react";
import { isDefaultTutorBio } from "@/lib/tutor-listing-copy";
import type { TutorBioAiPurpose } from "@/lib/tutor-bio-ai";

export function TutorBioAiHelp({
  bio,
  name,
  headline,
  subjects,
  location,
  country,
  qualifications,
  experienceYears,
  teachingMethod,
  languages,
  levels,
  expertise,
  listings,
  purpose = "bio",
  hourlyRateLabel,
  online,
  inPerson,
  boards,
  qualificationStages,
  syllabusCodes,
  onApply,
}: {
  bio: string;
  name: string;
  headline: string;
  subjects: string[];
  location: string;
  country: string;
  qualifications: string;
  experienceYears: number | null;
  teachingMethod: string;
  languages: string;
  levels: string | string[];
  expertise: string;
  listings?: string;
  purpose?: TutorBioAiPurpose;
  hourlyRateLabel?: string;
  online?: boolean;
  inPerson?: boolean;
  boards?: string[];
  qualificationStages?: string[];
  syllabusCodes?: string[];
  onApply: (bio: string) => void;
}) {
  const [loading, setLoading] = useState<"generate" | "improve" | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [extra, setExtra] = useState("");
  const [undoBio, setUndoBio] = useState<string | null>(null);
  const placeholder = isDefaultTutorBio(bio);
  const canImprove = !placeholder;

  async function requestDraft(mode: "generate" | "improve") {
    setLoading(mode);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/ai/tutor-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          purpose,
          name,
          bio,
          headline,
          subjects,
          location,
          country,
          qualifications,
          experienceYears,
          teachingMethod,
          languages,
          levels,
          expertise,
          listings: listings?.trim() || undefined,
          notes: extra.trim() || undefined,
          hourlyRateLabel: hourlyRateLabel?.trim() || undefined,
          online,
          inPerson,
          boards,
          qualificationStages,
          syllabusCodes,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { bio?: string; error?: string };
      if (!res.ok || !data.bio) {
        setError(
          data.error ||
            (purpose === "teachingDescription"
              ? "Could not draft the teaching description. Try again."
              : "Could not draft the introduction. Try again."),
        );
        return;
      }
      setUndoBio(bio);
      onApply(data.bio);
      setNote("Draft inserted below — edit anything that isn't accurate. Nothing is public until you save.");
    } catch {
      setError("Could not reach the writing helper. Check your connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  function undo() {
    if (undoBio == null) return;
    onApply(undoBio);
    setUndoBio(null);
    setNote("Restored your previous text.");
  }

  return (
    <div className="tutor-bio-ai">
      <div className="tutor-bio-ai-actions">
        <button
          className="btn btn-sm"
          type="button"
          disabled={Boolean(loading)}
          aria-busy={loading === "generate"}
          onClick={() => requestDraft("generate")}
        >
          {loading === "generate" ? "Writing…" : "Help me write this"}
        </button>
        {canImprove ? (
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={Boolean(loading)}
            aria-busy={loading === "improve"}
            onClick={() => requestDraft("improve")}
          >
            {loading === "improve" ? "Improving…" : "Improve with AI"}
          </button>
        ) : null}
        {undoBio != null ? (
          <button className="btn btn-secondary btn-sm" type="button" disabled={Boolean(loading)} onClick={undo}>
            Undo
          </button>
        ) : null}
      </div>
      <p className="field-hint tutor-bio-ai-hint">
        {purpose === "teachingDescription"
          ? placeholder
            ? "Select subject, rate, lesson mode, and the capability chips first. We’ll mention what you picked — grouped if there are many, not a raw list of codes."
            : "Uses this form: subject, rate, online/in-person, levels, boards, awards, and codes. It will not invent experience, degrees, or reviews."}
          : placeholder
            ? "The placeholder text is ignored — we will start from your name and any subjects you have added, not that default line."
            : "Uses your name, subjects, and other profile details. It will not invent experience, qualifications, or reviews."}
      </p>
      <details className="tutor-bio-ai-notes">
        <summary>Optional notes for the draft</summary>
        <label>
          <span className="sr-only">Notes for the writing helper</span>
          <textarea
            rows={2}
            maxLength={500}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="True extras only, e.g. exam boards you teach or how you run lessons."
          />
        </label>
      </details>
      {note ? (
        <p className="success tutor-bio-ai-status" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="form-error tutor-bio-ai-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
