export const DEFAULT_TUTOR_BIO = "New tutor — update this profile.";

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
  online?: boolean;
  inPerson?: boolean;
  qualifications?: string | null;
};

export function getTutorProfileCompletion(input: TutorProfileCompletionInput) {
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
      ok: Boolean(input.country?.trim() && input.country.trim().length >= 2),
      required: true,
    },
    {
      key: "city",
      label: "City",
      ok: Boolean(input.location?.trim() && input.location.trim().length >= 2),
      required: true,
    },
    {
      key: "subjects",
      label: "Subjects",
      ok: Boolean(input.subjects?.trim()),
      required: true,
    },
    {
      key: "rate",
      label: "Hourly rate",
      ok: Number(input.hourlyRate) >= 500,
      required: true,
    },
    {
      key: "lessonType",
      label: "Lesson type",
      ok: Boolean(input.online || input.inPerson),
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
