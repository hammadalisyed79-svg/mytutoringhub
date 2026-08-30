import {
  isTutorCityComplete,
  resolveTeachingCompletion,
  type TutorProfileCompletionInput,
} from "@/lib/tutor-profile-completion";

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
 * Teaching step is qualifications / lesson-mode defaults.
 * Finish is “create first Teaching Profile” unless a valid ACTIVE listing already exists.
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

  if (!profile.country?.trim() || !isTutorCityComplete(profile)) return "place";

  const modeOk = Boolean(profile.online || profile.inPerson);
  const qualsOk = Boolean(profile.qualifications?.trim());
  if (!modeOk || !qualsOk) return "teaching";

  const teaching = resolveTeachingCompletion(profile);
  if (!teaching.hasValidTeachingProfile) return "finish";

  return "finish";
}
