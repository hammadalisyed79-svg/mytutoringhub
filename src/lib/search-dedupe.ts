/**
 * Teaching Profile search display (Phase 4).
 *
 * Specific search (resolved subject and/or board / level / syllabus code):
 *   one card per matching Teaching Profile — no per-tutor collapse.
 * Broad search (location / keyword / empty):
 *   max 2 cards from the same TutorProfile per result page.
 * "Also teaches" is a secondary cross-link only (subject labels), not a substitute for a card.
 */

export const BROAD_SEARCH_MAX_CARDS_PER_TUTOR = 2;

export type DedupeListingInput = {
  tutorProfileId: string;
  listingId: string;
  subject: string;
  title: string;
  level: string;
  score: number;
};

export type AlsoTeachesItem = {
  listingId: string;
  subject: string;
  title: string;
  level: string;
};

export type DedupedTutorResult<T extends DedupeListingInput> = T & {
  alsoTeaches: AlsoTeachesItem[];
};

export function isSpecificTeachingProfileSearch(filters: {
  subject?: string | null;
  board?: string | null;
  level?: string | null;
  syllabusCode?: string | null;
}): boolean {
  return Boolean(
    (filters.subject || "").trim() ||
      (filters.board || "").trim() ||
      (filters.level || "").trim() ||
      (filters.syllabusCode || "").trim(),
  );
}

/**
 * Place each listing on the earliest page that still has room and where that
 * tutor is under `maxPerTutor`. Extra listings defer to later pages (not dropped).
 * Do not flatten-then-slice: a short page 1 must not pull page 2 cards back in.
 */
export function paginateWithTutorCap<T extends { tutorProfileId: string }>(
  scored: T[],
  page: number,
  pageSize: number,
  maxPerTutor: number,
): { items: T[]; total: number; pages: number } {
  const total = scored.length;
  if (pageSize < 1) return { items: [], total, pages: 1 };
  const cap = Number.isFinite(maxPerTutor) ? Math.max(1, maxPerTutor) : pageSize;
  const buckets: T[][] = [];
  const counts: Map<string, number>[] = [];

  for (const row of scored) {
    let i = 0;
    while (true) {
      if (!buckets[i]) {
        buckets[i] = [];
        counts[i] = new Map();
      }
      const used = counts[i]!.get(row.tutorProfileId) || 0;
      if (buckets[i]!.length < pageSize && used < cap) {
        buckets[i]!.push(row);
        counts[i]!.set(row.tutorProfileId, used + 1);
        break;
      }
      i += 1;
    }
  }

  const pageCount = Math.max(1, buckets.length);
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    items: buckets[safePage - 1] || [],
    total,
    pages: pageCount,
  };
}

/** @deprecated Use paginateWithTutorCap — flatten+slice re-merges deferred cards. */
export function applyPerPageTutorCap<T extends { tutorProfileId: string }>(
  scored: T[],
  pageSize: number,
  maxPerTutor: number,
): T[] {
  const pages = Math.max(1, Math.ceil(scored.length / Math.max(1, pageSize)));
  const out: T[] = [];
  for (let page = 1; page <= pages + scored.length; page += 1) {
    const { items, pages: pageCount } = paginateWithTutorCap(scored, page, pageSize, maxPerTutor);
    out.push(...items);
    if (page >= pageCount) break;
  }
  return out;
}

export function tutorHasMoreThanCap<T extends { tutorProfileId: string }>(
  scored: T[],
  maxPerTutor: number,
): boolean {
  const counts = new Map<string, number>();
  for (const row of scored) {
    const n = (counts.get(row.tutorProfileId) || 0) + 1;
    if (n > maxPerTutor) return true;
    counts.set(row.tutorProfileId, n);
  }
  return false;
}

/** Subject-only cross-links to sibling Teaching Profiles not shown on this page. */
export function attachAlsoTeaches<T extends DedupeListingInput>(
  pageItems: T[],
  allScored: T[],
  maxAlso = 4,
): DedupedTutorResult<T>[] {
  const onPage = new Set(pageItems.map((row) => row.listingId));
  return pageItems.map((item) => {
    const hiddenSiblings = allScored.filter(
      (row) =>
        row.tutorProfileId === item.tutorProfileId &&
        row.listingId !== item.listingId &&
        !onPage.has(row.listingId),
    );
    const alsoTeaches = hiddenSiblings.slice(0, maxAlso).map((row) => ({
      listingId: row.listingId,
      subject: row.subject,
      title: row.subject,
      level: "",
    }));
    return { ...item, alsoTeaches };
  });
}

/**
 * @deprecated Phase 4 search uses applyPerPageTutorCap + attachAlsoTeaches.
 * Kept for any leftover one-card-per-tutor callers (none on the main search path).
 */
export function dedupeSearchByTutor<T extends DedupeListingInput>(
  scored: T[],
  maxAlso = 4,
): DedupedTutorResult<T>[] {
  const byTutor = new Map<string, T[]>();
  for (const row of scored) {
    const list = byTutor.get(row.tutorProfileId) || [];
    list.push(row);
    byTutor.set(row.tutorProfileId, list);
  }

  const out: DedupedTutorResult<T>[] = [];
  for (const group of byTutor.values()) {
    group.sort((a, b) => b.score - a.score);
    const best = group[0]!;
    const alsoTeaches = group.slice(1, 1 + maxAlso).map((row) => ({
      listingId: row.listingId,
      subject: row.subject,
      title: row.title,
      level: row.level,
    }));
    out.push({ ...best, alsoTeaches });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}
