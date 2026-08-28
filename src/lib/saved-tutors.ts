/** Client-side saved tutors + recently viewed (no account required). */

const FAVORITES_KEY = "mth_saved_tutors_v1";
const RECENT_KEY = "mth_recent_tutors_v1";
const MAX_RECENT = 8;

export type SavedTutorRef = {
  tutorProfileId: string;
  listingId?: string;
  name: string;
  subject?: string;
  photoUrl?: string | null;
  href: string;
  savedAt: number;
};

function readList(key: string): SavedTutorRef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTutorRef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key: string, rows: SavedTutorRef[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(rows));
  window.dispatchEvent(new Event("mth-saved-tutors"));
}

export function listSavedTutors(): SavedTutorRef[] {
  return readList(FAVORITES_KEY);
}

export function isTutorSaved(tutorProfileId: string): boolean {
  return listSavedTutors().some((row) => row.tutorProfileId === tutorProfileId);
}

export function toggleSavedTutor(ref: SavedTutorRef): boolean {
  const rows = listSavedTutors();
  const idx = rows.findIndex((row) => row.tutorProfileId === ref.tutorProfileId);
  if (idx >= 0) {
    rows.splice(idx, 1);
    writeList(FAVORITES_KEY, rows);
    return false;
  }
  rows.unshift({ ...ref, savedAt: Date.now() });
  writeList(FAVORITES_KEY, rows.slice(0, 40));
  return true;
}

export function listRecentTutors(): SavedTutorRef[] {
  return readList(RECENT_KEY);
}

export function trackRecentTutor(ref: Omit<SavedTutorRef, "savedAt">) {
  const rows = listRecentTutors().filter((row) => row.tutorProfileId !== ref.tutorProfileId);
  rows.unshift({ ...ref, savedAt: Date.now() });
  writeList(RECENT_KEY, rows.slice(0, MAX_RECENT));
}
