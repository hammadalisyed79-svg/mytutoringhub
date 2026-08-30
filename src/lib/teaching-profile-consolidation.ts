/**
 * Safe Teaching Profile consolidation TOOLING — preview / dry-run only.
 *
 * Does not merge, redirect, pause, delete, or rewrite `/listings/{id}`.
 * Does not explode TutorProfile.subjects CSV into extra Teaching Profiles.
 * Phase 9 is the only phase that may execute a merge after this preview is approved.
 */

import {
  capabilitiesFromScalarRow,
  isCapabilityKind,
  type SubjectProfileCapabilityKind,
  type SubjectProfileCapabilityRow,
} from "@/lib/teaching-profile-capabilities";
import { canonicalTeachingSubject } from "@/lib/teaching-profile-subject";
import { splitSubjectsCsv } from "@/lib/subject-profile";
import {
  type CanonicalSubjectGroup,
  type TeachingProfileUniquenessRow,
} from "@/lib/teaching-profile-duplicates";

export const CONSOLIDATION_EXECUTE = false;

export const TEACHING_PROFILE_SURVIVOR_RULES = `## Survivor selection (preview only — not executed)

When two or more Teaching Profiles share a TutorProfile + canonical subject, Phase 9 may later keep **one** row and 301 the others. Until then this is documentation + dry-run output only.

Priority (first match wins):

1. **Live Listing Boost** — keep the row whose \`boostUntil\` is still in the future. Boost is paid visibility on a specific \`/listings/{id}\`; dropping that URL would strand a purchase.
2. **Live Highlight** — else keep the row with a live \`highlightedUntil\` window.
3. **Most complete capabilities** — else keep the row with the largest distinct set of levels + boards + qualifications + syllabus codes (join rows if present, otherwise scalar cache). Completeness preserves exam-family data that V2 stored on separate listings.
4. **Oldest public URL** — else keep the earliest \`createdAt\` so the longest-lived \`/listings/{id}\` stays the canonical URL.
5. **Tie-break** — lexicographically smallest id.

Conflicts the dry-run **records** but does not resolve:

- Disagreeing listing rates → survivor keeps its rate; others are noted.
- Two+ live Boost windows → survivor keeps its window; other windows are flagged (Phase 9 must decide extend-vs-drop).
- Two+ live Highlight windows — same.

**Not done by this tooling**

- No \`UPDATE\` / \`DELETE\` / status change.
- No redirects.
- No unique index apply.
- Leftover \`TutorProfile.subjects\` CSV tags are listed as “do not auto-create”.
`;

export type ConsolidationListing = TeachingProfileUniquenessRow & {
  title?: string | null;
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
  rate?: number | null;
  boostUntil?: Date | null;
  highlightedUntil?: Date | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  description?: string | null;
  headline?: string | null;
  capabilities?: { kind: string; value: string }[];
};

export type SurvivorPick = {
  survivor: ConsolidationListing;
  reasons: string[];
};

export type ConsolidationDryRun = {
  execute: false;
  tutorProfileId: string;
  canonical: string;
  survivorId: string;
  redirectIds: string[];
  capabilityUnion: SubjectProfileCapabilityRow[];
  rateConflict: boolean;
  rates: number[];
  boostConflict: boolean;
  highlightConflict: boolean;
  liveBoostIds: string[];
  liveHighlightIds: string[];
  survivorReasons: string[];
  listingIds: string[];
  wouldBackfillCanonicalSubject: { id: string; from: string; to: string }[];
};

export function capabilitiesForConsolidation(row: ConsolidationListing): SubjectProfileCapabilityRow[] {
  if (row.capabilities?.length) {
    const out: SubjectProfileCapabilityRow[] = [];
    const seen = new Set<string>();
    for (const cap of row.capabilities) {
      if (!isCapabilityKind(cap.kind)) continue;
      const value = (cap.value || "").trim();
      if (!value) continue;
      const key = `${cap.kind}:${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: cap.kind, value });
    }
    if (out.length) return out;
  }
  return capabilitiesFromScalarRow({
    level: row.level,
    board: row.board,
    qualification: row.qualification,
    syllabusCode: row.syllabusCode,
  });
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLiveWindow(until: Date | string | null | undefined, now: Date): boolean {
  const d = asDate(until);
  return Boolean(d && d > now);
}

function capabilityCount(row: ConsolidationListing): number {
  return capabilitiesForConsolidation(row).length;
}

function createdStamp(row: ConsolidationListing): number {
  return asDate(row.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

export function selectSurvivor(
  rows: ConsolidationListing[],
  now: Date = new Date(),
): SurvivorPick {
  if (!rows.length) {
    throw new Error("selectSurvivor requires at least one Teaching Profile");
  }
  const ranked = [...rows].sort((a, b) => {
    const boostA = isLiveWindow(a.boostUntil, now) ? 1 : 0;
    const boostB = isLiveWindow(b.boostUntil, now) ? 1 : 0;
    if (boostA !== boostB) return boostB - boostA;
    const hiA = isLiveWindow(a.highlightedUntil, now) ? 1 : 0;
    const hiB = isLiveWindow(b.highlightedUntil, now) ? 1 : 0;
    if (hiA !== hiB) return hiB - hiA;
    const capA = capabilityCount(a);
    const capB = capabilityCount(b);
    if (capA !== capB) return capB - capA;
    const createdA = createdStamp(a);
    const createdB = createdStamp(b);
    if (createdA !== createdB) return createdA - createdB;
    return a.id.localeCompare(b.id);
  });
  const survivor = ranked[0]!;
  const reasons: string[] = [];
  if (isLiveWindow(survivor.boostUntil, now)) {
    reasons.push("live Listing Boost window");
  } else if (isLiveWindow(survivor.highlightedUntil, now)) {
    reasons.push("live Highlight window");
  } else if (capabilityCount(survivor) > 0 && ranked.some((r) => r.id !== survivor.id && capabilityCount(r) < capabilityCount(survivor))) {
    reasons.push("most complete capabilities");
  } else {
    reasons.push("oldest public URL (earliest createdAt)");
  }
  if (ranked.length > 1 && ranked[1] && createdStamp(survivor) <= createdStamp(ranked[1])) {
    if (!reasons.includes("oldest public URL (earliest createdAt)") && !isLiveWindow(survivor.boostUntil, now)) {
      reasons.push("oldest createdAt as tie-break among remaining rules");
    }
  }
  return { survivor, reasons };
}

export function unionCapabilities(rows: ConsolidationListing[]): SubjectProfileCapabilityRow[] {
  const buckets: Record<SubjectProfileCapabilityKind, Map<string, string>> = {
    LEVEL: new Map(),
    BOARD: new Map(),
    QUALIFICATION: new Map(),
    SYLLABUS_CODE: new Map(),
  };
  for (const row of rows) {
    for (const cap of capabilitiesForConsolidation(row)) {
      const key = cap.value.trim().toLowerCase();
      if (!key || buckets[cap.kind].has(key)) continue;
      buckets[cap.kind].set(key, cap.value);
    }
  }
  const kinds: SubjectProfileCapabilityKind[] = ["LEVEL", "BOARD", "QUALIFICATION", "SYLLABUS_CODE"];
  return kinds.flatMap((kind) =>
    [...buckets[kind].values()].map((value) => ({ kind, value })),
  );
}

export function dryRunConsolidateGroup(
  group: CanonicalSubjectGroup<ConsolidationListing>,
  now: Date = new Date(),
): ConsolidationDryRun {
  const { survivor, reasons } = selectSurvivor(group.rows, now);
  const redirectIds = group.rows.filter((row) => row.id !== survivor.id).map((row) => row.id);
  const rates = [...new Set(group.rows.map((row) => Number(row.rate)).filter((n) => Number.isFinite(n)))];
  const liveBoostIds = group.rows.filter((row) => isLiveWindow(row.boostUntil, now)).map((row) => row.id);
  const liveHighlightIds = group.rows
    .filter((row) => isLiveWindow(row.highlightedUntil, now))
    .map((row) => row.id);
  const canonical = group.canonical;
  const wouldBackfillCanonicalSubject = group.rows
    .map((row) => {
      const to = canonicalTeachingSubject(row.subject).canonical || canonical;
      const from = (row.canonicalSubject || "").trim();
      if (!to || from.toLowerCase() === to.toLowerCase()) return null;
      return { id: row.id, from: from || "(empty)", to };
    })
    .filter((row): row is { id: string; from: string; to: string } => Boolean(row));

  return {
    execute: CONSOLIDATION_EXECUTE,
    tutorProfileId: group.tutorProfileId,
    canonical,
    survivorId: survivor.id,
    redirectIds,
    capabilityUnion: unionCapabilities(group.rows),
    rateConflict: rates.length >= 2,
    rates,
    boostConflict: liveBoostIds.length >= 2,
    highlightConflict: liveHighlightIds.length >= 2,
    liveBoostIds,
    liveHighlightIds,
    survivorReasons: reasons,
    listingIds: group.rows.map((row) => row.id),
    wouldBackfillCanonicalSubject,
  };
}

/**
 * CSV tags on the master profile that are not already a Teaching Profile.
 * Listed for a dashboard prompt later — never auto-created here.
 */
export function leftoverCsvTagsNotExploded(
  csv: string | null | undefined,
  listings: { subject: string }[],
): { tag: string; canonical: string; alreadyHasTeachingProfile: boolean }[] {
  const listingKeys = new Set(
    listings
      .map((row) => canonicalTeachingSubject(row.subject).key)
      .filter(Boolean),
  );
  const out: { tag: string; canonical: string; alreadyHasTeachingProfile: boolean }[] = [];
  const seen = new Set<string>();
  for (const tag of splitSubjectsCsv(csv)) {
    const ident = canonicalTeachingSubject(tag);
    if (!ident.key || seen.has(ident.key)) continue;
    seen.add(ident.key);
    out.push({
      tag,
      canonical: ident.canonical || tag,
      alreadyHasTeachingProfile: listingKeys.has(ident.key),
    });
  }
  return out.filter((row) => !row.alreadyHasTeachingProfile);
}
