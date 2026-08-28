"use client";

import { useEffect, useState } from "react";
import { isTutorSaved, toggleSavedTutor, type SavedTutorRef } from "@/lib/saved-tutors";

export function SaveTutorButton({
  tutor,
  className = "",
  compact,
}: {
  tutor: Omit<SavedTutorRef, "savedAt">;
  className?: string;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isTutorSaved(tutor.tutorProfileId));
    function sync() {
      setSaved(isTutorSaved(tutor.tutorProfileId));
    }
    window.addEventListener("mth-saved-tutors", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mth-saved-tutors", sync);
      window.removeEventListener("storage", sync);
    };
  }, [tutor.tutorProfileId]);

  return (
    <button
      type="button"
      className={`save-tutor-btn${saved ? " is-saved" : ""}${compact ? " is-compact" : ""} ${className}`.trim()}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${tutor.name} from saved tutors` : `Save ${tutor.name}`}
      title={saved ? "Saved" : "Save for later"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(toggleSavedTutor({ ...tutor, savedAt: Date.now() }));
      }}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {!compact && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
