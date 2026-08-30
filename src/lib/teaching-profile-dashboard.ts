/**
 * Dashboard helpers for My Teaching Profiles (Phase 5).
 * One profile = one canonical subject. Capabilities are multi-value, not extra rows.
 */

import {
  capabilitiesFromScalarRow,
  capabilityValues,
  isCapabilityKind,
  joinCapabilityLabels,
  type SubjectProfileCapabilityRow,
} from "@/lib/teaching-profile-capabilities";
import { isGeneralTutoringFallback } from "@/lib/teaching-profile-write";
import { normalizeSubjectLabel } from "@/lib/subject-profile";

export type DashboardCapabilityListing = {
  subject?: string | null;
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
  capabilities?: { kind: string; value: string }[] | null;
};

export type TeachingProfileEditorValues = {
  levels: string[];
  boards: string[];
  qualifications: string[];
  syllabusCodes: string[];
};

export function teachingProfileSubjectChoices(subjects: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of subjects) {
    const name = normalizeSubjectLabel(raw);
    if (!name || isBlockedTeachingSubject(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function isBlockedTeachingSubject(subject: string | null | undefined): boolean {
  const name = normalizeSubjectLabel(subject || "");
  if (!name) return true;
  if (isGeneralTutoringFallback(name)) return true;
  return name.toLowerCase() === "general";
}

export function dashboardCapabilityRows(
  listing: DashboardCapabilityListing,
): SubjectProfileCapabilityRow[] {
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

export function teachingProfileEditorValues(
  listing: DashboardCapabilityListing,
): TeachingProfileEditorValues {
  const rows = dashboardCapabilityRows(listing);
  return {
    levels: capabilityValues(rows, "LEVEL"),
    boards: capabilityValues(rows, "BOARD"),
    qualifications: capabilityValues(rows, "QUALIFICATION"),
    syllabusCodes: capabilityValues(rows, "SYLLABUS_CODE"),
  };
}

export function teachingProfileTaxonomyLine(listing: DashboardCapabilityListing): string {
  const values = teachingProfileEditorValues(listing);
  return [
    listing.subject,
    joinCapabilityLabels(values.boards),
    joinCapabilityLabels(values.qualifications.length ? values.qualifications : values.levels),
    joinCapabilityLabels(values.syllabusCodes),
  ]
    .filter(Boolean)
    .join(" · ");
}
