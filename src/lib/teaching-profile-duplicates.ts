/**
 * Teaching Profile duplicate detection and ACTIVE canonical-subject uniqueness.
 *
 * Product rule: at most one ACTIVE Teaching Profile per (TutorProfile + canonical subject).
 * Existing duplicate ACTIVE rows are left in place (detect only — no merge/pause/delete).
 * PAUSED (or HIDDEN) rows of the same canonical subject are allowed.
 */

import {
  canonicalTeachingSubject,
  sameCanonicalSubject,
  type CanonicalTeachingSubject,
} from "@/lib/teaching-profile-subject";

export const ACTIVE_CANONICAL_SUBJECT_CONFLICT = "active_canonical_subject_exists";

export type TeachingProfileUniquenessRow = {
  id: string;
  status: string;
  subject: string;
  canonicalSubject?: string | null;
  tutorProfileId?: string;
};

export type CanonicalSubjectGroup<T extends TeachingProfileUniquenessRow = TeachingProfileUniquenessRow> = {
  tutorProfileId: string;
  canonical: string;
  key: string;
  matched: boolean;
  source: string;
  rows: T[];
};

export type ActiveCanonicalClash<T extends TeachingProfileUniquenessRow = TeachingProfileUniquenessRow> = {
  listing: T;
  canonical: string;
};

export class ActiveCanonicalSubjectConflictError extends Error {
  readonly code = ACTIVE_CANONICAL_SUBJECT_CONFLICT;

  constructor(
    public canonical: string,
    public existingId: string,
  ) {
    super(
      `You already have an active ${canonical} Teaching Profile. Edit that profile instead of creating another.`,
    );
    this.name = "ActiveCanonicalSubjectConflictError";
  }
}

export function isActiveTeachingProfileStatus(status: string | null | undefined): boolean {
  return (status || "ACTIVE").trim().toUpperCase() === "ACTIVE";
}

/** Resolve canonical identity from the tutor's subject label, falling back to stored canonicalSubject. */
export function listingCanonicalIdentity(row: TeachingProfileUniquenessRow): CanonicalTeachingSubject {
  const fromSubject = canonicalTeachingSubject(row.subject);
  if (fromSubject.key) return fromSubject;
  return canonicalTeachingSubject(row.canonicalSubject);
}

export function groupByCanonicalSubject<T extends TeachingProfileUniquenessRow>(
  rows: T[],
): CanonicalSubjectGroup<T>[] {
  const groupMap = new Map<string, CanonicalSubjectGroup<T>>();
  for (const row of rows) {
    const ident = listingCanonicalIdentity(row);
    const tutorId = row.tutorProfileId || "";
    const key = ident.key || foldFallback(row.subject || row.canonicalSubject || "");
    const mapKey = `${tutorId}::${key || "_empty"}`;
    const existing = groupMap.get(mapKey);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    groupMap.set(mapKey, {
      tutorProfileId: tutorId,
      canonical: ident.canonical || row.subject || row.canonicalSubject || "",
      key,
      matched: ident.matched,
      source: ident.source,
      rows: [row],
    });
  }
  return [...groupMap.values()].sort(
    (a, b) => b.rows.length - a.rows.length || a.canonical.localeCompare(b.canonical),
  );
}

export function multiRowCanonicalGroups<T extends TeachingProfileUniquenessRow>(
  groups: CanonicalSubjectGroup<T>[],
): CanonicalSubjectGroup<T>[] {
  return groups.filter((g) => g.rows.length >= 2);
}

export function activeCanonicalCollisionGroups<T extends TeachingProfileUniquenessRow>(
  groups: CanonicalSubjectGroup<T>[],
): CanonicalSubjectGroup<T>[] {
  return groups.filter(
    (g) => g.rows.filter((row) => isActiveTeachingProfileStatus(row.status)).length >= 2,
  );
}

export function canApplyActiveCanonicalUniqueIndex<T extends TeachingProfileUniquenessRow>(
  groups: CanonicalSubjectGroup<T>[],
): boolean {
  return activeCanonicalCollisionGroups(groups).length === 0;
}

/**
 * Find an ACTIVE listing with the same canonical subject as `candidateSubject`.
 * Does not consider PAUSED / HIDDEN rows as a clash.
 */
export function findActiveCanonicalClash<T extends TeachingProfileUniquenessRow>(
  existing: T[],
  candidateSubject: string,
  opts?: { excludeId?: string },
): ActiveCanonicalClash<T> | null {
  const candidate = canonicalTeachingSubject(candidateSubject);
  if (!candidate.key) return null;
  for (const row of existing) {
    if (opts?.excludeId && row.id === opts.excludeId) continue;
    if (!isActiveTeachingProfileStatus(row.status)) continue;
    const other = listingCanonicalIdentity(row);
    if (other.key && other.key === candidate.key) {
      return { listing: row, canonical: candidate.canonical || other.canonical };
    }
  }
  return null;
}

/**
 * Whether a create / activate / subject-change would add a *new* ACTIVE canonical collision.
 * Updates to an already-ACTIVE listing that keep the same canonical subject are allowed
 * so the existing 7 production collisions can stay in place.
 */
export function shouldRejectActiveCanonicalWrite<T extends TeachingProfileUniquenessRow>(opts: {
  existing: T[];
  nextStatus: string;
  nextSubject: string;
  excludeId?: string;
  previousStatus?: string;
  previousSubject?: string;
}): ActiveCanonicalClash<T> | null {
  if (!isActiveTeachingProfileStatus(opts.nextStatus)) return null;
  const clash = findActiveCanonicalClash(opts.existing, opts.nextSubject, {
    excludeId: opts.excludeId,
  });
  if (!clash) return null;
  const alreadyActiveSameCanonical =
    Boolean(opts.excludeId) &&
    isActiveTeachingProfileStatus(opts.previousStatus) &&
    sameCanonicalSubject(opts.previousSubject, opts.nextSubject);
  if (alreadyActiveSameCanonical) return null;
  return clash;
}

export function activeCanonicalConflictPayload(clash: ActiveCanonicalClash): {
  error: string;
  code: string;
  canonical: string;
  existingId: string;
} {
  return {
    error: `You already have an active ${clash.canonical} Teaching Profile. Edit that profile instead of creating another.`,
    code: ACTIVE_CANONICAL_SUBJECT_CONFLICT,
    canonical: clash.canonical,
    existingId: clash.listing.id,
  };
}

export function formatTeachingProfileDuplicateMessage(canonicalLabels: string[]): string {
  const labels = canonicalLabels.filter(Boolean);
  if (labels.length === 0) return "";
  if (labels.length === 1) {
    return `You have more than one ${labels[0]} Teaching Profile — consolidate later`;
  }
  if (labels.length === 2) {
    return `You have more than one Teaching Profile for ${labels[0]} and ${labels[1]} — consolidate later`;
  }
  const head = labels.slice(0, -1).join(", ");
  return `You have more than one Teaching Profile for ${head}, and ${labels[labels.length - 1]} — consolidate later`;
}

export type TutorCanonicalDuplicateGroup = {
  canonical: string;
  listingIds: string[];
  activeCount: number;
  total: number;
};

export function tutorCanonicalDuplicateGroups<T extends TeachingProfileUniquenessRow>(
  rows: T[],
): TutorCanonicalDuplicateGroup[] {
  return multiRowCanonicalGroups(groupByCanonicalSubject(rows)).map((g) => ({
    canonical: g.canonical,
    listingIds: g.rows.map((row) => row.id),
    activeCount: g.rows.filter((row) => isActiveTeachingProfileStatus(row.status)).length,
    total: g.rows.length,
  }));
}

export function tutorCanonicalDuplicateNotice<T extends TeachingProfileUniquenessRow>(
  rows: T[],
): { message: string; groups: TutorCanonicalDuplicateGroup[] } | null {
  const groups = tutorCanonicalDuplicateGroups(rows);
  if (!groups.length) return null;
  return {
    message: formatTeachingProfileDuplicateMessage(groups.map((g) => g.canonical)),
    groups,
  };
}

function foldFallback(subject: string) {
  return subject.trim().toLowerCase() || "_empty";
}
