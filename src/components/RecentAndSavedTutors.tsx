"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  clearAnonymousTutorMemory,
  isDisplayableTutorRef,
  listRecentTutors,
  listSavedTutors,
  reconcileStoredTutors,
  trackRecentTutor,
  type SavedTutorRef,
} from "@/lib/saved-tutors";

export function TrackTutorView({ tutor }: { tutor: Omit<SavedTutorRef, "savedAt"> }) {
  const { status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      clearAnonymousTutorMemory();
      return;
    }
    trackRecentTutor(tutor);
  }, [
    status,
    tutor.tutorProfileId,
    tutor.href,
    tutor.name,
    tutor.listingId,
    tutor.subject,
    tutor.photoUrl,
  ]);
  return null;
}

export function RecentAndSavedTutors({
  mode = "both",
  recentHeading = "Recently viewed",
  className,
}: {
  mode?: "recent" | "saved" | "both";
  /** Override the recently-viewed section heading (homepage continue rail). */
  recentHeading?: string;
  className?: string;
}) {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [recent, setRecent] = useState<SavedTutorRef[]>([]);
  const [saved, setSaved] = useState<SavedTutorRef[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!signedIn) {
      clearAnonymousTutorMemory();
      setRecent([]);
      setSaved([]);
      return;
    }

    let cancelled = false;

    function applyLocal() {
      setRecent(listRecentTutors().filter(isDisplayableTutorRef));
      setSaved(listSavedTutors().filter(isDisplayableTutorRef));
    }

    async function boot() {
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

    window.addEventListener("mth-saved-tutors", applyLocal);
    window.addEventListener("storage", applyLocal);
    return () => {
      cancelled = true;
      window.removeEventListener("mth-saved-tutors", applyLocal);
      window.removeEventListener("storage", applyLocal);
    };
  }, [signedIn, status]);

  if (!signedIn) return null;

  const showRecent = mode !== "saved" && recent.length > 0;
  const showSaved = mode !== "recent" && saved.length > 0;
  if (!showRecent && !showSaved) return null;

  return (
    <div className={`saved-tutors-rail${className ? ` ${className}` : ""}`}>
      {showRecent && (
        <section className="saved-tutors-block">
          <h2 className="saved-tutors-heading">{recentHeading}</h2>
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
