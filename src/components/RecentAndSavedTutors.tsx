"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listRecentTutors,
  listSavedTutors,
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
    function sync() {
      setRecent(listRecentTutors());
      setSaved(listSavedTutors());
    }
    sync();
    window.addEventListener("mth-saved-tutors", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mth-saved-tutors", sync);
      window.removeEventListener("storage", sync);
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
              <Link key={`r-${row.tutorProfileId}`} href={row.href} className="saved-tutor-chip">
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
