/**
 * Teaching Profile persist helpers (SubjectProfile + capability join rows).
 * Does not auto-create from TutorProfile.subjects CSV or "General tutoring".
 */

import {
  capabilitiesFromListingInput,
  displayScalarsFromCapabilities,
  type SubjectProfileCapabilityRow,
} from "@/lib/teaching-profile-capabilities";
import { canonicalTeachingSubject } from "@/lib/teaching-profile-subject";
import {
  ActiveCanonicalSubjectConflictError,
  shouldRejectActiveCanonicalWrite,
} from "@/lib/teaching-profile-duplicates";
import { defaultSubjectProfileTitle, normalizeSubjectLabel, splitSubjectsCsv } from "@/lib/subject-profile";
import { MIN_HOURLY_RATE_PKR } from "@/lib/currency";

export const TEACHING_PROFILE_UNIQUENESS_SELECT = {
  id: true,
  status: true,
  subject: true,
} as const;

export const GENERAL_TUTORING_LABEL = "General tutoring";

export type TeachingProfileListingInput = {
  subject: string;
  title?: string | null;
  headline?: string | null;
  description?: string | null;
  rate: number;
  online: boolean;
  inPerson: boolean;
  location?: string | null;
  country?: string | null;
  levels?: string[] | string | null;
  boards?: string[] | string | null;
  qualifications?: string[] | string | null;
  syllabusCodes?: string[] | string | null;
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
};

export type TeachingProfilePersistFields = {
  subject: string;
  canonicalSubject: string;
  title: string;
  headline: string | null;
  description: string | null;
  rate: number;
  online: boolean;
  inPerson: boolean;
  location: string;
  country: string | null;
  level: string;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
  capabilities: SubjectProfileCapabilityRow[];
};

export function teachingProfilePersistFields(
  input: TeachingProfileListingInput,
  opts?: { tutorName?: string | null },
): TeachingProfilePersistFields {
  const subject = normalizeSubjectLabel(input.subject);
  if (!subject) {
    throw new Error("Enter a subject");
  }
  if (isGeneralTutoringFallback(subject) || subject.toLowerCase() === "general") {
    throw new Error("Choose a specific subject — General tutoring is not a Teaching Profile.");
  }

  const ident = canonicalTeachingSubject(subject);
  const canonicalSubject = ident.canonical || subject;
  const capabilities = capabilitiesFromListingInput(input);
  const scalars = displayScalarsFromCapabilities(capabilities);
  const title =
    normalizeSubjectLabel(input.title || "") || defaultSubjectProfileTitle(subject, opts?.tutorName);
  const description = (input.description || "").trim() || null;
  const headline = (input.headline || "").trim() || null;
  const location = normalizeSubjectLabel(input.location || "") || "Online";
  const country = (input.country || "").trim() || null;

  return {
    subject,
    canonicalSubject,
    title,
    headline,
    description,
    rate: input.rate,
    online: Boolean(input.online),
    inPerson: Boolean(input.inPerson),
    location,
    country,
    level: scalars.level,
    board: scalars.board,
    qualification: scalars.qualification,
    syllabusCode: scalars.syllabusCode,
    capabilities,
  };
}

export function isGeneralTutoringFallback(subject: string | null | undefined): boolean {
  return normalizeSubjectLabel(subject || "").toLowerCase() === GENERAL_TUTORING_LABEL.toLowerCase();
}

export type TeachingProfileListabilityRow = {
  status?: string | null;
  subject?: string | null;
  rate?: number | null;
  online?: boolean | null;
  inPerson?: boolean | null;
};

/** ACTIVE Teaching Profile with a subject, listable rate, and lesson mode. */
export function isValidActiveTeachingProfile(row: TeachingProfileListabilityRow | null | undefined): boolean {
  if (!row) return false;
  const status = (row.status || "ACTIVE").trim().toUpperCase();
  if (status !== "ACTIVE") return false;
  if (!normalizeSubjectLabel(row.subject || "")) return false;
  if (Number(row.rate) < MIN_HOURLY_RATE_PKR) return false;
  return Boolean(row.online || row.inPerson);
}

export function teachingCompletionFromListings(
  listings: TeachingProfileListabilityRow[] | null | undefined,
): { hasValidTeachingProfile: boolean; hasValidListingRate: boolean } {
  const hasValidTeachingProfile = (listings || []).some(isValidActiveTeachingProfile);
  return {
    hasValidTeachingProfile,
    hasValidListingRate: hasValidTeachingProfile,
  };
}

/**
 * Existing tutors with a valid ACTIVE Teaching Profile must not be forced
 * through first-profile create (do not mint a duplicate Maths row).
 */
export function shouldSkipFirstTeachingProfileCreate(
  existing: TeachingProfileListabilityRow[] | null | undefined,
): boolean {
  return teachingCompletionFromListings(existing).hasValidTeachingProfile;
}

export function mergeDerivedMasterSubjects(existingCsv: string | null | undefined, subject: string): string {
  return derivedMasterSubjectsCsv([
    ...splitSubjectsCsv(existingCsv).map((name) => ({ status: "ACTIVE", subject: name })),
    { status: "ACTIVE", subject },
  ]);
}

/** Distinct ACTIVE Teaching Profile subjects. Alias labels collapse to the canonical display name. */
export function derivedMasterSubjectsCsv(
  listings: { status?: string | null; subject?: string | null }[],
): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of listings) {
    if ((row.status || "ACTIVE").trim().toUpperCase() !== "ACTIVE") continue;
    const ident = canonicalTeachingSubject(row.subject || "");
    const name = ident.canonical || normalizeSubjectLabel(row.subject || "");
    if (!name || isGeneralTutoringFallback(name) || name.toLowerCase() === "general") continue;
    const key = ident.key || name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.join(", ");
}

export async function syncDerivedMasterSubjects(tutorProfileId: string) {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.subjectProfile.findMany({
    where: { tutorProfileId },
    select: { status: true, subject: true },
  });
  const subjects = derivedMasterSubjectsCsv(rows);
  await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: { subjects },
  });
  return subjects;
}

export async function listTeachingProfilesForUniqueness(tutorProfileId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.subjectProfile.findMany({
    where: { tutorProfileId },
    select: TEACHING_PROFILE_UNIQUENESS_SELECT,
  });
}

export async function insertTeachingProfile(opts: {
  tutorProfileId: string;
  tutorName?: string | null;
  existingSubjectsCsv?: string | null;
  syncMasterRate?: boolean;
  input: TeachingProfileListingInput;
}) {
  const { prisma } = await import("@/lib/prisma");
  const fields = teachingProfilePersistFields(opts.input, { tutorName: opts.tutorName });
  const existing = await prisma.subjectProfile.findMany({
    where: { tutorProfileId: opts.tutorProfileId },
    select: TEACHING_PROFILE_UNIQUENESS_SELECT,
  });
  const clash = shouldRejectActiveCanonicalWrite({
    existing,
    nextStatus: "ACTIVE",
    nextSubject: fields.subject,
  });
  if (clash) {
    throw new ActiveCanonicalSubjectConflictError(clash.canonical, clash.listing.id);
  }
  const row = await prisma.subjectProfile.create({
    data: {
      tutorProfileId: opts.tutorProfileId,
      subject: fields.subject,
      canonicalSubject: fields.canonicalSubject,
      title: fields.title,
      headline: fields.headline,
      description: fields.description,
      level: fields.level,
      board: fields.board,
      qualification: fields.qualification,
      syllabusCode: fields.syllabusCode,
      location: fields.location,
      country: fields.country,
      online: fields.online,
      inPerson: fields.inPerson,
      rate: fields.rate,
      status: "ACTIVE",
      capabilities: {
        create: fields.capabilities.map((cap) => ({ kind: cap.kind, value: cap.value })),
      },
    },
  });
  await prisma.tutorAd
    .create({
      data: {
        tutorProfileId: opts.tutorProfileId,
        subject: row.subject,
        title: row.title,
        level: row.level,
        location: row.location,
        online: row.online,
        inPerson: row.inPerson,
        rate: row.rate,
        description: row.description,
        status: row.status,
      },
    })
    .catch(() => undefined);
  await prisma.tutorProfile.update({
    where: { id: opts.tutorProfileId },
    data: {
      ...(opts.syncMasterRate ? { hourlyRate: fields.rate } : {}),
    },
  });
  await syncDerivedMasterSubjects(opts.tutorProfileId);
  return row;
}

export async function replaceSubjectProfileCapabilities(
  subjectProfileId: string,
  rows: SubjectProfileCapabilityRow[],
) {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$transaction(async (tx) => {
    await tx.subjectProfileCapability.deleteMany({ where: { subjectProfileId } });
    if (!rows.length) return;
    await tx.subjectProfileCapability.createMany({
      data: rows.map((row) => ({
        subjectProfileId,
        kind: row.kind,
        value: row.value,
      })),
    });
  });
}
