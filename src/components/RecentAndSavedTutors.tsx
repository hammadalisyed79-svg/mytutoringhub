"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  isDisplayableTutorRef,
  listRecentTutors,
  listSavedTutors,
  reconcileStoredTutors,
  trackRecentTutor,
  type SavedTutorRef,
} from "@/lib/saved-tutors";

export function TrackTutorView({ tutor }: { tutor: Omit<SavedTutorRef, "savedAt"> }) {
  useEffect(() => {
    trackRecentTutor(tutor);
  }, [tutor.tutorProfileId, tutor.href, tutor.name, tutor.listingId, tutor.subject, tutor.photoUrl]);
  return null;
}

export function RecentAndSavedTutors({
  mode = "both",
}: {
  mode?: "recent" | "saved" | "both";
}) {
  const [recent, setRecent] = useState<SavedTutorRef[]>([]);
  const [saved, setSaved] = useState<SavedTutorRef[]>([]);

  useEffect(() => {
    let cancelled = false;

    function applyLocal() {
      setRecent(listRecentTutors().filter(isDisplayableTutorRef));
      setSaved(listSavedTutors().filter(isDisplayableTutorRef));
    }

    async function boot() {
      // Hide empty-name chips immediately, then purge IDs that 404 / aren't public.
      applyLocal();
      try {
        const cleaned = await reconcileStoredTutors();
        if (cancelled) return;
        setRecent(cleaned.recent);
        setSaved(cleaned.saved);
      } catch {
        if (!cancelled) applyLocal();
      }
    }

    void boot();

    // Local edits (save/unsave, other tabs) — do not re-hit the resolve API here
    // (reconcile writes localStorage and would loop).
    window.addEventListener("mth-saved-tutors", applyLocal);
    window.addEventListener("storage", applyLocal);
    return () => {
      cancelled = true;
      window.removeEventListener("mth-saved-tutors", applyLocal);
      window.removeEventListener("storage", applyLocal);
    };
  }, []);

  const showRecent = mode !== "saved" && recent.length > 0;
  const showSaved = mode !== "recent" && saved.length > 0;
  if (!showRecent && !showSaved) return null;

  return (
    <div className="saved-tutors-rail">
      {showRecent && (
        <section className="saved-tutors-block">
          <h2 className="saved-tutors-heading">Recently viewed</h2>
          <div className="saved-tutors-row">
            {recent.map((row) => (
              <Link
                key={`r-${row.tutorProfileId}`}
                href={row.href}
                className="saved-tutor-chip"
                title={row.subject ? `${row.name} · ${row.subject}` : row.name}
              >
                <span className="saved-tutor-chip-name">{row.name}</span>
                {row.subject && <span className="muted">{row.subject}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
      {showSaved && (
        <section className="saved-tutors-block">
          <h2 className="saved-tutors-heading">Saved tutors</h2>
          <div className="saved-tutors-row">
            {saved.slice(0, 8).map((row) => (
              <Link key={`s-${row.tutorProfileId}`} href={row.href} className="saved-tutor-chip is-saved">
                <span className="saved-tutor-chip-name">{row.name}</span>
                {row.subject && <span className="muted">{row.subject}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
