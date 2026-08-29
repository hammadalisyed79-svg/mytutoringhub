"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  const { status } = useSession();
  const pathname = usePathname();
  const signedIn = status === "authenticated";
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!signedIn) {
      setSaved(false);
      return;
    }
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
  }, [signedIn, tutor.tutorProfileId]);

  return (
    <button
      type="button"
      className={`save-tutor-btn${saved ? " is-saved" : ""}${compact ? " is-compact" : ""} ${className}`.trim()}
      aria-pressed={signedIn ? saved : false}
      aria-label={
        !signedIn
          ? `Sign in to save ${tutor.name}`
          : saved
            ? `Remove ${tutor.name} from saved tutors`
            : `Save ${tutor.name}`
      }
      title={!signedIn ? "Sign in to save" : saved ? "Saved" : "Save for later"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          const next = pathname || "/search";
          window.location.href = `/login?callbackUrl=${encodeURIComponent(next)}`;
          return;
        }
        setSaved(toggleSavedTutor({ ...tutor, savedAt: Date.now() }));
      }}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {!compact && <span>{saved ? "Saved" : signedIn ? "Save" : "Sign in to save"}</span>}
    </button>
  );
}
