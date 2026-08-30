/**
 * Teaching Profile capability kinds (join-table rows on SubjectProfile).
 * Scalar SubjectProfile.level/board/qualification/syllabusCode remain a display cache.
 * Phase 2 writers dual-write join rows + scalars.
 */

import { splitSubjectsCsv } from "@/lib/subject-profile";

export const SUBJECT_PROFILE_CAPABILITY_KINDS = [
  "LEVEL",
  "BOARD",
  "QUALIFICATION",
  "SYLLABUS_CODE",
] as const;

export type SubjectProfileCapabilityKind = (typeof SUBJECT_PROFILE_CAPABILITY_KINDS)[number];

export type SubjectProfileCapabilityRow = {
  kind: SubjectProfileCapabilityKind;
  value: string;
};

const ALL_LEVELS = /^all levels$/i;

export function isCapabilityKind(value: string): value is SubjectProfileCapabilityKind {
  return (SUBJECT_PROFILE_CAPABILITY_KINDS as readonly string[]).includes(value);
}

export function normalizeCapabilityValue(raw: string, kind: SubjectProfileCapabilityKind): string {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (kind === "SYLLABUS_CODE") return value.toUpperCase();
  return value;
}

export function capabilityGroupKey(raw: string, kind: SubjectProfileCapabilityKind): string {
  const value = normalizeCapabilityValue(raw, kind);
  if (!value) return "";
  if (kind === "SYLLABUS_CODE") return value;
  return value.toLowerCase();
}

function pushUnique(
  out: SubjectProfileCapabilityRow[],
  seen: Set<string>,
  kind: SubjectProfileCapabilityKind,
  raw: string,
) {
  const value = normalizeCapabilityValue(raw, kind);
  if (!value) return;
  if (kind === "LEVEL" && ALL_LEVELS.test(value)) return;
  const key = `${kind}:${capabilityGroupKey(value, kind)}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ kind, value });
}

function valuesOf(raw: string[] | string | null | undefined): string[] {
  if (Array.isArray(raw)) return raw;
  return splitSubjectsCsv(raw);
}

export function capabilitiesFromScalarRow(row: {
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
}): SubjectProfileCapabilityRow[] {
  const out: SubjectProfileCapabilityRow[] = [];
  const seen = new Set<string>();
  for (const part of splitSubjectsCsv(row.level)) pushUnique(out, seen, "LEVEL", part);
  for (const part of splitSubjectsCsv(row.board)) pushUnique(out, seen, "BOARD", part);
  for (const part of splitSubjectsCsv(row.qualification)) pushUnique(out, seen, "QUALIFICATION", part);
  for (const part of splitSubjectsCsv(row.syllabusCode)) pushUnique(out, seen, "SYLLABUS_CODE", part);
  return out;
}

/** Multi-value wizard / API arrays → join-table rows. */
export function capabilitiesFromMultiValue(input: {
  levels?: string[] | string | null;
  boards?: string[] | string | null;
  qualifications?: string[] | string | null;
  syllabusCodes?: string[] | string | null;
}): SubjectProfileCapabilityRow[] {
  const out: SubjectProfileCapabilityRow[] = [];
  const seen = new Set<string>();
  for (const part of valuesOf(input.levels)) pushUnique(out, seen, "LEVEL", part);
  for (const part of valuesOf(input.boards)) pushUnique(out, seen, "BOARD", part);
  for (const part of valuesOf(input.qualifications)) pushUnique(out, seen, "QUALIFICATION", part);
  for (const part of valuesOf(input.syllabusCodes)) pushUnique(out, seen, "SYLLABUS_CODE", part);
  return out;
}

/**
 * Prefer explicit arrays when the client sent them (including empty = none).
 * Otherwise expand today's singular scalars (TutorAdsManager).
 */
export function capabilitiesFromListingInput(input: {
  levels?: string[] | string | null;
  boards?: string[] | string | null;
  qualifications?: string[] | string | null;
  syllabusCodes?: string[] | string | null;
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
}): SubjectProfileCapabilityRow[] {
  const usedArrays =
    Array.isArray(input.levels) ||
    Array.isArray(input.boards) ||
    Array.isArray(input.qualifications) ||
    Array.isArray(input.syllabusCodes);
  if (usedArrays) return capabilitiesFromMultiValue(input);
  return capabilitiesFromScalarRow({
    level: input.level,
    board: input.board,
    qualification: input.qualification,
    syllabusCode: input.syllabusCode,
  });
}

export function joinCapabilityLabels(values: string[]): string {
  return values.filter(Boolean).join(" · ");
}

/**
 * Rebuild the scalar display cache from join rows.
 * Primary = first row of each kind (insertion order). Level defaults to "All levels".
 */
export function displayScalarsFromCapabilities(rows: SubjectProfileCapabilityRow[]): {
  level: string;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
} {
  const first = (kind: SubjectProfileCapabilityKind) =>
    rows.find((row) => row.kind === kind)?.value?.trim() || "";

  const level = first("LEVEL");
  const board = first("BOARD");
  const qualification = first("QUALIFICATION");
  const syllabusCode = first("SYLLABUS_CODE");

  return {
    level: level && !ALL_LEVELS.test(level) ? level : level || "All levels",
    board: board || null,
    qualification: qualification || null,
    syllabusCode: syllabusCode ? syllabusCode.toUpperCase() : null,
  };
}
