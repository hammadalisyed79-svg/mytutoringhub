/**
 * Teaching Profile capability matching for search.
 * Filters use join-table rows when present, plus scalar display-cache columns.
 * Does not query TutorProfile.levels (master CSV) for listing-level match.
 */

import {
  capabilitiesFromScalarRow,
  isCapabilityKind,
  type SubjectProfileCapabilityKind,
  type SubjectProfileCapabilityRow,
} from "@/lib/teaching-profile-capabilities";
import { sameCanonicalSubject } from "@/lib/teaching-profile-subject";

export type SearchCapabilityListing = {
  subject?: string | null;
  title?: string | null;
  canonicalSubject?: string | null;
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
  capabilities?: { kind: string; value: string }[] | null;
};

export type SearchCapabilityFilters = {
  subject?: string | null;
  board?: string | null;
  level?: string | null;
  syllabusCode?: string | null;
};

function containsInsensitive(hay: string | null | undefined, needle: string) {
  const h = (hay || "").trim().toLowerCase();
  const n = needle.trim().toLowerCase();
  return Boolean(h && n && h.includes(n));
}

export function listingCapabilityRows(listing: SearchCapabilityListing): SubjectProfileCapabilityRow[] {
  const fromJoin: SubjectProfileCapabilityRow[] = [];
  for (const row of listing.capabilities || []) {
    if (!isCapabilityKind(row.kind)) continue;
    const value = (row.value || "").trim();
    if (!value) continue;
    fromJoin.push({ kind: row.kind, value });
  }
  if (fromJoin.length) return fromJoin;
  return capabilitiesFromScalarRow({
    level: listing.level,
    board: listing.board,
    qualification: listing.qualification,
    syllabusCode: listing.syllabusCode,
  });
}

export function listingHasCapability(
  listing: SearchCapabilityListing,
  kind: SubjectProfileCapabilityKind,
  needle: string,
): boolean {
  const n = needle.trim();
  if (!n) return true;
  if (kind === "SYLLABUS_CODE") {
    const want = n.toUpperCase();
    if ((listing.syllabusCode || "").toUpperCase().includes(want)) return true;
    return listingCapabilityRows(listing).some(
      (row) => row.kind === "SYLLABUS_CODE" && row.value.toUpperCase().includes(want),
    );
  }
  if (kind === "BOARD") {
    if (containsInsensitive(listing.board, n)) return true;
    return listingCapabilityRows(listing).some(
      (row) => row.kind === "BOARD" && containsInsensitive(row.value, n),
    );
  }
  if (kind === "LEVEL" || kind === "QUALIFICATION") {
    if (containsInsensitive(listing.level, n) || containsInsensitive(listing.qualification, n)) {
      return true;
    }
    return listingCapabilityRows(listing).some(
      (row) =>
        (row.kind === "LEVEL" || row.kind === "QUALIFICATION") && containsInsensitive(row.value, n),
    );
  }
  return false;
}

/** True when the listing satisfies every supplied capability filter (AND). */
export function listingMatchesCapabilityFilters(
  listing: SearchCapabilityListing,
  filters: SearchCapabilityFilters,
): boolean {
  const board = (filters.board || "").trim();
  const level = (filters.level || "").trim();
  const code = (filters.syllabusCode || "").trim();
  if (board && !listingHasCapability(listing, "BOARD", board)) return false;
  if (level && !listingHasCapability(listing, "LEVEL", level)) return false;
  if (code && !listingHasCapability(listing, "SYLLABUS_CODE", code)) return false;
  return true;
}

export function listingMatchesCanonicalSubject(
  listing: SearchCapabilityListing,
  subject: string | null | undefined,
): boolean {
  const want = (subject || "").trim();
  if (!want) return true;
  return (
    sameCanonicalSubject(listing.subject, want) ||
    sameCanonicalSubject(listing.canonicalSubject, want) ||
    sameCanonicalSubject(listing.title, want)
  );
}

function containsClause(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export function capabilitySomeClause(kind: SubjectProfileCapabilityKind, value: string) {
  return {
    capabilities: {
      some: {
        kind,
        value: containsClause(value),
      },
    },
  };
}

/** Prisma OR fragments: scalar cache OR join-table capability. */
export function teachingProfileCapabilityWhere(filters: {
  board?: string;
  level?: string;
  syllabusCode?: string;
  includeJoinTable: boolean;
}) {
  const board = (filters.board || "").trim();
  const level = (filters.level || "").trim();
  const syllabusCode = (filters.syllabusCode || "").trim();
  const extra: Record<string, unknown>[] = [];

  if (board) {
    extra.push({
      OR: [
        { board: containsClause(board) },
        ...(filters.includeJoinTable ? [capabilitySomeClause("BOARD", board)] : []),
      ],
    });
  }
  if (level) {
    extra.push({
      OR: [
        { level: containsClause(level) },
        { qualification: containsClause(level) },
        ...(filters.includeJoinTable
          ? [capabilitySomeClause("LEVEL", level), capabilitySomeClause("QUALIFICATION", level)]
          : []),
      ],
    });
  }
  if (syllabusCode) {
    extra.push({
      OR: [
        { syllabusCode: containsClause(syllabusCode) },
        ...(filters.includeJoinTable ? [capabilitySomeClause("SYLLABUS_CODE", syllabusCode)] : []),
      ],
    });
  }

  return extra;
}

export function isMissingCapabilitySchemaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /SubjectProfileCapability|canonicalSubject|does not exist|Unknown field `capabilities`|Unknown arg `capabilities`|Unknown field `canonicalSubject`/i.test(
    message,
  );
}
