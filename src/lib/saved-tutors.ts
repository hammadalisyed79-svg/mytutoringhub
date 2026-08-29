/**
 * Client-side saved tutors + recently viewed.
 * Persist only for signed-in visitors — guests can search, but we do not store recents.
 */

const FAVORITES_KEY = "mth_saved_tutors_v1";
const RECENT_KEY = "mth_recent_tutors_v1";
const MAX_RECENT = 8;

/** Remove leftover guest recents/saves so they never appear without an account. */
export function clearAnonymousTutorMemory() {
  if (typeof window === "undefined") return;
  let changed = false;
  for (const key of [FAVORITES_KEY, RECENT_KEY]) {
    if (window.localStorage.getItem(key) != null) {
      window.localStorage.removeItem(key);
      changed = true;
    }
  }
  if (changed) window.dispatchEvent(new Event("mth-saved-tutors"));
}

export type SavedTutorRef = {
  tutorProfileId: string;
  listingId?: string;
  name: string;
  subject?: string;
  photoUrl?: string | null;
  href: string;
  savedAt: number;
};

/** Chip must have an id, href, and a display name — otherwise it renders as an empty white button. */
export function isDisplayableTutorRef(
  row: Pick<SavedTutorRef, "tutorProfileId" | "name" | "href">,
): boolean {
  return Boolean(row.tutorProfileId?.trim() && row.href?.trim() && row.name?.trim());
}

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
  if (typeof window === "undefined") return false;
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
  if (typeof window === "undefined") return;
  if (!isDisplayableTutorRef(ref)) return;
  const rows = listRecentTutors().filter((row) => row.tutorProfileId !== ref.tutorProfileId);
  rows.unshift({ ...ref, savedAt: Date.now() });
  writeList(RECENT_KEY, rows.slice(0, MAX_RECENT));
}

/** Replace recent list (e.g. after purging deleted / non-public tutors). */
export function replaceRecentTutors(rows: SavedTutorRef[]) {
  writeList(RECENT_KEY, rows.filter(isDisplayableTutorRef).slice(0, MAX_RECENT));
}

/** Replace saved list (e.g. after purging deleted / non-public tutors). */
export function replaceSavedTutors(rows: SavedTutorRef[]) {
  writeList(FAVORITES_KEY, rows.filter(isDisplayableTutorRef).slice(0, 40));
}

type ResolveApiTutor = {
  tutorProfileId: string;
  listingId?: string;
  name: string;
  subject?: string;
  photoUrl?: string | null;
  href: string;
};

/**
 * Ask the server which stored tutor refs still resolve to a public listing,
 * then rewrite localStorage. Returns the cleaned recent + saved lists.
 */
export async function reconcileStoredTutors(): Promise<{
  recent: SavedTutorRef[];
  saved: SavedTutorRef[];
}> {
  const recentLocal = listRecentTutors();
  const savedLocal = listSavedTutors();

  // Drop obviously broken chips immediately (empty name → white placeholder).
  const recentUsable = recentLocal.filter(isDisplayableTutorRef);
  const savedUsable = savedLocal.filter(isDisplayableTutorRef);
  if (recentUsable.length !== recentLocal.length) replaceRecentTutors(recentUsable);
  if (savedUsable.length !== savedLocal.length) replaceSavedTutors(savedUsable);

  const byId = new Map<string, { tutorProfileId: string; listingId?: string }>();
  for (const row of [...recentUsable, ...savedUsable]) {
    if (!byId.has(row.tutorProfileId)) {
      byId.set(row.tutorProfileId, {
        tutorProfileId: row.tutorProfileId,
        listingId: row.listingId,
      });
    }
  }

  if (byId.size === 0) {
    return { recent: [], saved: [] };
  }

  let resolved: ResolveApiTutor[] = [];
  try {
    const res = await fetch("/api/tutors/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [...byId.values()] }),
    });
    if (!res.ok) {
      // Keep displayable local chips if the network/API fails.
      return { recent: recentUsable, saved: savedUsable };
    }
    const data = (await res.json()) as { tutors?: ResolveApiTutor[] };
    resolved = Array.isArray(data.tutors) ? data.tutors : [];
  } catch {
    return { recent: recentUsable, saved: savedUsable };
  }

  const resolvedById = new Map(resolved.map((t) => [t.tutorProfileId, t]));

  function merge(local: SavedTutorRef[]): SavedTutorRef[] {
    const out: SavedTutorRef[] = [];
    for (const row of local) {
      const live = resolvedById.get(row.tutorProfileId);
      if (!live) continue;
      out.push({
        ...row,
        name: live.name,
        subject: live.subject ?? row.subject,
        photoUrl: live.photoUrl ?? row.photoUrl,
        href: live.href || row.href,
        listingId: live.listingId ?? row.listingId,
      });
    }
    return out;
  }

  const recent = merge(recentUsable);
  const saved = merge(savedUsable);
  replaceRecentTutors(recent);
  replaceSavedTutors(saved);
  return { recent, saved };
}
