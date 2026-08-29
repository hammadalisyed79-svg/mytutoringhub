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
  subjects?: string | null;
  hourlyRate?: number | null;
  /**
   * Marketplace V2: Teaching Listing.rate is authoritative.
   * When true, profile hourlyRate is not required for completion/listability.
   */
  hasValidListingRate?: boolean;
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

/**
 * Rate / lesson mode are seeded on signup. Only count them once the tutor has
 * chosen subjects (teaching step), so defaults never look “done”.
 */
export function isTutorTeachingComplete(input: TutorProfileCompletionInput) {
  const subjectsOk = Boolean(input.subjects?.trim());
  if (!subjectsOk) return false;
  const rateOk = Number(input.hourlyRate) >= 500 || Boolean(input.hasValidListingRate);
  const modeOk = Boolean(input.online || input.inPerson);
  return rateOk && modeOk;
}

export function getTutorProfileCompletion(input: TutorProfileCompletionInput) {
  const teachingStarted = Boolean(input.subjects?.trim());
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
      key: "subjects",
      label: "Subjects",
      ok: teachingStarted,
      required: true,
    },
    {
      key: "rate",
      label: "Hourly rate",
      ok:
        teachingStarted &&
        (Number(input.hourlyRate) >= 500 || Boolean(input.hasValidListingRate)),
      required: true,
    },
    {
      key: "lessonType",
      label: "Lesson type",
      ok: teachingStarted && Boolean(input.online || input.inPerson),
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

export function isTutorProfileStarted(profile: {
  photoUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  subjects?: string | null;
  qualifications?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
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
