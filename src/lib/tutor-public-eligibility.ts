/**
 * Canonical public-visibility computation for tutor profiles.
 * Mirrors `syncTutorBadges` active rule without writing to the database:
 *   active = forceActive || (emailVerified && isTutorProfileListable(...))
 */
import { isSuspiciousDisplayName } from "@/lib/display-name";
import { isTutorProfileListable } from "@/lib/subscription";
import {
  getTutorProfileCompletion,
  type TutorProfileCompletionInput,
} from "@/lib/tutor-profile-completion";

export type TutorVisibilityInput = TutorProfileCompletionInput & {
  forceActive?: boolean;
  emailVerified?: Date | string | boolean | null;
  suspended?: boolean;
};

export type TutorVisibilityAssessment = {
  desiredActive: boolean;
  listable: boolean;
  emailVerified: boolean;
  suspiciousName: boolean;
  complete: boolean;
  missingRequired: string[];
  /** Reasons the profile would be hidden under ordinary (non-forceActive) rules. */
  blockReasons: string[];
  /** forceActive would keep the profile public despite blockReasons. */
  forceActiveOverride: boolean;
};

export function isEmailVerifiedFlag(value: Date | string | boolean | null | undefined): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value);
}

/** Same boolean used by syncTutorBadges for TutorProfile.active. */
export function computeDesiredTutorPublicActive(input: TutorVisibilityInput): TutorVisibilityAssessment {
  const emailVerified = isEmailVerifiedFlag(input.emailVerified);
  const suspiciousName = isSuspiciousDisplayName(input.name);
  const completion = getTutorProfileCompletion(input);
  const listable = isTutorProfileListable(input, input.name);
  const forceActive = Boolean(input.forceActive);

  const blockReasons: string[] = [];
  if (!emailVerified) blockReasons.push("email_unverified");
  if (suspiciousName) blockReasons.push("suspicious_display_name");
  if (!completion.complete) {
    for (const label of completion.missingRequired) {
      blockReasons.push(`incomplete:${label}`);
    }
  }

  const ordinaryEligible = emailVerified && listable;
  const desiredActive = forceActive || ordinaryEligible;

  return {
    desiredActive,
    listable,
    emailVerified,
    suspiciousName,
    complete: completion.complete,
    missingRequired: completion.missingRequired,
    blockReasons,
    forceActiveOverride: forceActive && !ordinaryEligible,
  };
}

/** Prisma `where` fragment for public catalogue surfaces (search, homepage, sitemap, etc.). */
export function publicListedTutorWhere() {
  return {
    active: true,
    user: { suspended: false },
  } as const;
}

/** Whether a tutor profile should be visible to the public (not owner/admin preview). */
export function canViewTutorProfilePublicly(
  input: TutorVisibilityInput & { active: boolean },
): boolean {
  if (!input.active || input.suspended) return false;
  return computeDesiredTutorPublicActive(input).desiredActive;
}

type ProfileWithUser = TutorVisibilityInput & {
  active: boolean;
  user?: {
    name?: string | null;
    emailVerified?: Date | string | boolean | null;
    suspended?: boolean;
  } | null;
};

/** Normalize Prisma tutor rows for visibility checks. */
export function tutorPublicVisibilityInput(profile: ProfileWithUser): TutorVisibilityInput & {
  active: boolean;
  suspended?: boolean;
} {
  return {
    ...profile,
    name: profile.name ?? profile.user?.name ?? undefined,
    emailVerified: profile.emailVerified ?? profile.user?.emailVerified,
    suspended: profile.suspended ?? profile.user?.suspended,
  };
}

export function isCanonicallyPublicTutor(profile: ProfileWithUser): boolean {
  return canViewTutorProfilePublicly(tutorPublicVisibilityInput(profile));
}

export function filterCanonicallyPublicTutors<T extends ProfileWithUser>(profiles: T[]): T[] {
  return profiles.filter(isCanonicallyPublicTutor);
}

/** Subject hub slugs that are metadata segments, not tutoring subjects. */
const SUBJECT_SITEMAP_SKIP = new Set([
  "mark-scheme",
  "mark-schemes",
  "question-paper",
  "question-papers",
  "specimen",
  "feb-march",
  "feb-march-series",
  "may-june",
  "oct-nov",
  "past-papers",
  "pastpapers",
  "papers",
  "uploads",
  "manifest",
  "manifests",
  "json",
  "catalog",
]);

export function isIndexableSubjectHubSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.length < 2) return false;
  if (SUBJECT_SITEMAP_SKIP.has(normalized)) return false;
  if (/^(mark-scheme|question-paper|specimen|feb-march|may-june|oct-nov)/.test(normalized)) {
    return false;
  }
  return true;
}
