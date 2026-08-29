import type { TutorProfileCompletionInput } from "@/lib/tutor-profile-completion";

/** Short FindTutor-style setup — advanced fields live outside this flow. */
export const TUTOR_WIZARD_STEP_IDS = [
  "photo",
  "basics",
  "place",
  "teaching",
  "finish",
] as const;

export type TutorWizardStepId = (typeof TUTOR_WIZARD_STEP_IDS)[number];

/**
 * Resume at the first incomplete required step.
 */
export function resolveTutorWizardResumeStep(
  profile: TutorProfileCompletionInput & {
    photoUrl?: string | null;
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
  const qualsOk = Boolean(profile.qualifications?.trim());
  if (!subjectsOk || !rateOk || !modeOk || !qualsOk) return "teaching";

  return "finish";
}
