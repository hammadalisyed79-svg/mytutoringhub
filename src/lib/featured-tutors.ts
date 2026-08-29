/**
 * Homepage featured tutors: one card per tutor, strongest active listing.
 * Listings are assumed pre-sorted strongest-first (highlight → boost → recency).
 */

export type FeaturedListingInput = {
  listingId: string;
  tutorProfileId: string;
};

/** Inputs for the homepage hero product composition tutor card. */
export type HeroShowcaseTutorInput = FeaturedListingInput & {
  photoUrl?: string | null;
  hourlyRate?: number | null;
  subject?: string | null;
  user: { name?: string | null };
};

/**
 * Stable hero tutor: first public-eligible listing (already strongest-first)
 * that has a real photo, display name, subject, and positive rate.
 * Returns null when nothing is complete — caller shows a generic discovery card.
 */
export function pickHeroShowcaseTutor<T extends HeroShowcaseTutorInput>(
  listings: T[],
): T | null {
  for (const row of listings) {
    const name = row.user?.name?.trim();
    const subject = (row.subject || "").trim();
    const photo = (row.photoUrl || "").trim();
    const rate = row.hourlyRate;
    if (!name || !subject) continue;
    if (!photo.startsWith("http")) continue;
    if (typeof rate !== "number" || !(rate > 0)) continue;
    return row;
  }
  return null;
}

/**
 * Keep first occurrence of each tutor (strongest listing when input is sorted).
 * Caps at `limit` unique tutors.
 */
export function dedupeFeaturedListingsByTutor<T extends FeaturedListingInput>(
  listings: T[],
  limit = 4,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of listings) {
    const id = row.tutorProfileId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/** Short context line from qualification / board / level fields. */
export function featuredListingContextLine(opts: {
  qualification?: string | null;
  board?: string | null;
  level?: string | null;
}): string {
  const parts = [opts.qualification, opts.board, opts.level]
    .map((s) => (s || "").trim())
    .filter((s) => s && s.toLowerCase() !== "all levels");
  const unique: string[] = [];
  for (const p of parts) {
    if (!unique.some((u) => u.toLowerCase() === p.toLowerCase())) unique.push(p);
  }
  return unique.slice(0, 3).join(" · ");
}

/** One-line bio/headline snippet for featured cards. */
export function featuredShortLine(text?: string | null, max = 110): string {
  const raw = (text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > 40 ? cut.slice(0, at) : cut).trimEnd()}…`;
}
