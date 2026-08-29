import type { TutorProfileCompletionInput } from "@/lib/tutor-profile-completion";

export const TUTOR_WIZARD_STEP_IDS = [
  "photo",
  "basics",
  "place",
  "teaching",
  "qualifications",
  "extras",
  "schedule",
  "contact",
  "verify",
  "finish",
] as const;

export type TutorWizardStepId = (typeof TUTOR_WIZARD_STEP_IDS)[number];

/**
 * Resume the profile wizard at the first incomplete required step.
 * Optional steps are skipped for resume — tutors can open them from the step rail.
 */
export function resolveTutorWizardResumeStep(
  profile: TutorProfileCompletionInput & {
    photoUrl?: string | null;
    availability?: string | null;
    phone?: string | null;
    videoUrl?: string | null;
    introVideoUrl?: string | null;
  },
  opts?: { verified?: boolean; preferFinishWhenLive?: boolean; live?: boolean },
): TutorWizardStepId {
  if (opts?.live || opts?.preferFinishWhenLive) return "finish";

  if (!profile.photoUrl?.startsWith("https://")) return "photo";

  const nameOk = (profile.name?.trim().length || 0) >= 2;
  const headlineOk = (profile.headline?.trim().length || 0) >= 8;
  const bioOk = (profile.bio?.trim().length || 0) >= 40;
  if (!nameOk || !headlineOk || !bioOk) return "basics";

  if (!profile.country?.trim() || !profile.location?.trim()) return "place";

  const subjectsOk = Boolean(profile.subjects?.trim());
  const rateOk = typeof profile.hourlyRate === "number" && profile.hourlyRate >= 500;
  const modeOk = Boolean(profile.online || profile.inPerson);
  // Seeded rate/online without subjects still means teaching is unfinished.
  if (!subjectsOk || !rateOk || !modeOk) return "teaching";

  if (!profile.qualifications?.trim()) return "qualifications";

  if (!opts?.verified) return "verify";

  return "finish";
}
