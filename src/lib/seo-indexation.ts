/**
 * Indexation helpers for public routes.
 * Separates crawlable user URLs from what should rank in search engines.
 */

const SEARCH_FILTER_KEYS = [
  "q",
  "subject",
  "location",
  "country",
  "level",
  "language",
  "mode",
  "max",
  "verified",
  "trial",
] as const;

/** Bare `/search` may be indexed; filtered/paginated result URLs should not. */
export function searchResultsShouldNoIndex(sp: Record<string, string | undefined | null>): boolean {
  const page = Math.max(1, Number(sp.page) || 1);
  if (page > 1) return true;
  return SEARCH_FILTER_KEYS.some((key) => String(sp[key] ?? "").trim().length > 0);
}

/** Past-paper subject landing stays indexable; year/session/paper filters should not. */
export function pastPaperFiltersShouldNoIndex(sp: {
  year?: string | null;
  session?: string | null;
  paper?: string | null;
  documentType?: string | null;
}): boolean {
  return Boolean(
    String(sp.year ?? "").trim() ||
      String(sp.session ?? "").trim() ||
      String(sp.paper ?? "").trim() ||
      String(sp.documentType ?? "").trim(),
  );
}

/** Subject/city landings with no tutors are thin — keep reachable but noindex. */
export function subjectLandingShouldNoIndex(tutorCount: number): boolean {
  return tutorCount <= 0;
}
