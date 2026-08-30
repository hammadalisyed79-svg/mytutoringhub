import { MIN_HOURLY_RATE_PKR } from "@/lib/currency";
import {
  teachingCompletionFromListings,
  type TeachingProfileListabilityRow,
} from "@/lib/teaching-profile-write";

export const DEFAULT_TUTOR_BIO = "New tutor — update this profile.";

/** Registration / OAuth seed — not intentional tutor choices. */
export const TUTOR_PROFILE_SEED_RATE_PKR = 1500;

export type ProfileFieldCheck = {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
};

export type TutorProfileCompletionInput = {
  name?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  location?: string | null;
  /** Derived cache only — not a listability gate. */
  subjects?: string | null;
  hourlyRate?: number | null;
  /**
   * Marketplace V2: Teaching Profile.rate is authoritative.
   * When true, master hourlyRate is not required for completion/listability.
   */
  hasValidListingRate?: boolean;
  /**
   * At least one ACTIVE Teaching Profile with subject, valid rate, and lesson mode.
   * Public searchability must not depend on TutorProfile.subjects CSV.
   */
  hasValidTeachingProfile?: boolean;
  /** Optional listings — used when the boolean flags are omitted. */
  subjectProfiles?: TeachingProfileListabilityRow[] | null;
  online?: boolean;
  inPerson?: boolean;
  qualifications?: string | null;
};

function hasCountry(input: TutorProfileCompletionInput) {
  return Boolean(input.country?.trim() && input.country.trim().length >= 2);
}

/** City only counts when country is set — bare "Online" seed is not a completed place. */
export function isTutorCityComplete(input: TutorProfileCompletionInput) {
  const location = input.location?.trim() || "";
  if (!hasCountry(input) || location.length < 2) return false;
  return true;
}

export function resolveTeachingCompletion(input: TutorProfileCompletionInput) {
  if (typeof input.hasValidTeachingProfile === "boolean") {
    const rate = Boolean(input.hasValidListingRate) || input.hasValidTeachingProfile;
    return {
      hasValidTeachingProfile: input.hasValidTeachingProfile,
      hasValidListingRate: rate,
    };
  }
  if (input.subjectProfiles) {
    return teachingCompletionFromListings(input.subjectProfiles);
  }
  if (input.hasValidListingRate) {
    return { hasValidTeachingProfile: true, hasValidListingRate: true };
  }
  return { hasValidTeachingProfile: false, hasValidListingRate: false };
}

/**
 * Teaching is complete only with an ACTIVE Teaching Profile (subject + rate + mode).
 * Master subjects CSV and master hourlyRate are not sufficient.
 */
export function isTutorTeachingComplete(input: TutorProfileCompletionInput) {
  return resolveTeachingCompletion(input).hasValidTeachingProfile;
}

export function getTutorProfileCompletion(input: TutorProfileCompletionInput) {
  const teaching = resolveTeachingCompletion(input);
  const rateOk =
    teaching.hasValidListingRate ||
    (teaching.hasValidTeachingProfile && Number(input.hourlyRate) >= MIN_HOURLY_RATE_PKR);

  const checks: ProfileFieldCheck[] = [
    { key: "name", label: "Name", ok: (input.name?.trim().length ?? 0) >= 2, required: true },
    {
      key: "photo",
      label: "Profile photo",
      ok: Boolean(input.photoUrl?.trim()?.startsWith("https://")),
      required: true,
    },
    {
      key: "headline",
      label: "Headline",
      ok: Boolean(input.headline?.trim() && input.headline.trim().length >= 8),
      required: true,
    },
    {
      key: "bio",
      label: "About you",
      ok: Boolean(input.bio?.trim() && input.bio.trim().length >= 40),
      required: true,
    },
    {
      key: "country",
      label: "Country",
      ok: hasCountry(input),
      required: true,
    },
    {
      key: "city",
      label: "City",
      ok: isTutorCityComplete(input),
      required: true,
    },
    {
      key: "teachingProfile",
      label: "Teaching Profile",
      ok: teaching.hasValidTeachingProfile,
      required: true,
    },
    {
      key: "rate",
      label: "Hourly rate",
      ok: teaching.hasValidTeachingProfile && rateOk,
      required: true,
    },
    {
      key: "lessonType",
      label: "Lesson type",
      ok: teaching.hasValidTeachingProfile,
      required: true,
    },
    {
      key: "qualifications",
      label: "Highest qualification",
      ok: Boolean(input.qualifications?.trim()),
      required: true,
    },
  ];

  const missingRequired = checks.filter((row) => row.required && !row.ok).map((row) => row.label);
  const requiredTotal = checks.filter((row) => row.required).length;
  const requiredDone = checks.filter((row) => row.required && row.ok).length;

  return {
    complete: missingRequired.length === 0,
    checks,
    missingRequired,
    requiredDone,
    requiredTotal,
  };
}

export function isTutorProfileComplete(input: TutorProfileCompletionInput) {
  return getTutorProfileCompletion(input).complete;
}

/** Normalize Prisma tutor rows (optionally with subjectProfiles) for completion helpers. */
export function completionInputFromTutorRow(
  profile: TutorProfileCompletionInput & {
    subjectProfiles?: TeachingProfileListabilityRow[] | null;
  },
  name?: string | null,
): TutorProfileCompletionInput {
  const teaching = teachingCompletionFromListings(profile.subjectProfiles);
  return {
    ...profile,
    name: name ?? profile.name,
    hasValidTeachingProfile:
      profile.hasValidTeachingProfile !== undefined
        ? profile.hasValidTeachingProfile
        : teaching.hasValidTeachingProfile,
    hasValidListingRate:
      profile.hasValidListingRate !== undefined ? profile.hasValidListingRate : teaching.hasValidListingRate,
  };
}

export function isTutorProfileStarted(profile: {
  photoUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  subjects?: string | null;
  qualifications?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  hasValidTeachingProfile?: boolean;
  subjectProfiles?: TeachingProfileListabilityRow[] | null;
}) {
  if (profile.hasValidTeachingProfile) return true;
  if (teachingCompletionFromListings(profile.subjectProfiles).hasValidTeachingProfile) return true;
  if (profile.photoUrl?.trim()) return true;
  if (profile.headline?.trim()) return true;
  if (profile.qualifications?.trim()) return true;
  if (profile.country?.trim()) return true;
  if (profile.subjects?.trim()) return true;
  const bio = profile.bio?.trim() || "";
  if (bio && bio !== DEFAULT_TUTOR_BIO && !bio.startsWith("New tutor")) return true;
  if (profile.createdAt && profile.updatedAt) {
    return profile.updatedAt.getTime() - profile.createdAt.getTime() > 5 * 60 * 1000;
  }
  return false;
}
