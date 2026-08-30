/**
 * Canonical subject identity for Teaching Profiles (SubjectProfile).
 *
 * Uniqueness (later phases): one ACTIVE row per TutorProfile + canonical key.
 * Display `SubjectProfile.subject` may keep the tutor's original label.
 *
 * Does not change wizard UX, search, or listing APIs. Preview/migration tooling
 * and future writers should call this instead of unique-on-raw-subject.
 */

import { catalogSubjectNames } from "@/lib/subject-catalog";
import { resolveSubjectName } from "@/lib/search-smart";
import { normalizeSubjectLabel } from "@/lib/subject-profile";

export type CanonicalTeachingSubjectSource =
  | "empty"
  | "alias"
  | "catalog"
  | "exam_family"
  | "code_suffix"
  | "verbatim";

export type CanonicalTeachingSubject = {
  /** Pretty label stored on SubjectProfile.canonicalSubject (catalog spelling when matched). */
  canonical: string;
  /** Case-folded grouping / unique-index companion. */
  key: string;
  matched: boolean;
  source: CanonicalTeachingSubjectSource;
  /** Whitespace-normalized original (tutor-facing display candidate). */
  display: string;
};

/** Longest-first exam-family prefixes that must not mint extra Teaching Profiles. */
const EXAM_FAMILY_PREFIXES = [
  "as level",
  "a2 level",
  "a level",
  "o level",
  "11 plus",
  "ib diploma",
  "ib myp",
  "ib pyp",
  "igcse",
  "gcse",
  "cbse",
  "waec",
  "atar",
  "ssc",
  "hsc",
  "ib",
  "ap",
].sort((a, b) => b.length - a.length);

function foldKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveCatalog(raw: string) {
  return resolveSubjectName(raw, catalogSubjectNames());
}

function sourceForResolved(raw: string, resolved: string): "alias" | "catalog" {
  const foldedRaw = foldKey(raw);
  const foldedResolved = foldKey(resolved);
  if (foldedRaw === foldedResolved) return "catalog";
  return "alias";
}

function stripExamFamilyRemainder(folded: string): string | null {
  for (const prefix of EXAM_FAMILY_PREFIXES) {
    if (folded === prefix) return null;
    if (folded.startsWith(`${prefix} `)) {
      const rest = folded.slice(prefix.length).trim();
      return rest || null;
    }
  }
  return null;
}

function stripTrailingSyllabusCode(display: string): string | null {
  const match = display.trim().match(/^(.*?)[\s\-]+(\d{3,5}[A-Za-z]?)$/);
  const head = match?.[1]?.trim();
  if (!head || head.length < 2) return null;
  return head;
}

function fromResolved(
  display: string,
  resolved: string,
  source: CanonicalTeachingSubjectSource,
): CanonicalTeachingSubject {
  return {
    canonical: resolved,
    key: foldKey(resolved),
    matched: true,
    source,
    display,
  };
}

/**
 * Map a free-text subject label to the Teaching Profile canonical subject.
 *
 * Rules (Phase 1):
 * 1. Trim / collapse whitespace (`normalizeSubjectLabel`).
 * 2. Reuse `resolveSubjectName` + catalog (`catalogSubjectNames`) + SUBJECT_ALIASES / SUBJECT_CODES.
 * 3. Exam-family prefixes on catalog chips (e.g. "GCSE Maths") collapse to the core subject
 *    (Mathematics). Level/board belong in capabilities, not extra profiles.
 * 4. Trailing syllabus codes on an otherwise matched subject ("Chemistry 5070") collapse to the subject.
 * 5. Custom labels that do not match stay verbatim (tutor casing preserved); uniqueness is case-insensitive via `key`.
 * 6. Exam-prep products (SAT Prep, IELTS, CSS Prep, …) stay distinct subjects.
 */
export function canonicalTeachingSubject(raw: string | null | undefined): CanonicalTeachingSubject {
  const display = normalizeSubjectLabel(raw || "");
  if (!display) {
    return { canonical: "", key: "", matched: false, source: "empty", display: "" };
  }

  const codeHead = stripTrailingSyllabusCode(display);
  if (codeHead) {
    const fromCode = resolveCatalog(codeHead);
    if (fromCode.matched && fromCode.value) {
      const peeled = peelExamFamily(fromCode.value, display);
      if (peeled) return peeled;
      return fromResolved(display, fromCode.value, "code_suffix");
    }
  }

  const direct = resolveCatalog(display);
  const peeled = peelExamFamily(direct.matched ? direct.value : display, display);
  if (peeled) return peeled;

  if (direct.matched && direct.value) {
    return fromResolved(display, direct.value, sourceForResolved(display, direct.value));
  }

  return {
    canonical: display,
    key: foldKey(display),
    matched: false,
    source: "verbatim",
    display,
  };
}

function peelExamFamily(label: string, display: string): CanonicalTeachingSubject | null {
  const remainder = stripExamFamilyRemainder(foldKey(label));
  if (!remainder) return null;
  const resolved = resolveCatalog(remainder);
  if (!resolved.matched || !resolved.value) return null;
  return fromResolved(display, resolved.value, "exam_family");
}

export function canonicalTeachingSubjectKey(raw: string | null | undefined): string {
  return canonicalTeachingSubject(raw).key;
}

export function sameCanonicalSubject(a: string | null | undefined, b: string | null | undefined): boolean {
  const keyA = canonicalTeachingSubjectKey(a);
  const keyB = canonicalTeachingSubjectKey(b);
  return Boolean(keyA) && keyA === keyB;
}
