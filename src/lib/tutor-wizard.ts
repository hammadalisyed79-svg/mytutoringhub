import {
  isTutorCityComplete,
  type TutorProfileCompletionInput,
} from "@/lib/tutor-profile-completion";

/** Required steps first; optional extras each get their own skippable step. */
export const TUTOR_WIZARD_STEP_IDS = [
  "photo",
  "basics",
  "place",
  "teaching",
  "details",
  "schedule",
  "contact",
  "verify",
  "finish",
] as const;

export type TutorWizardStepId = (typeof TUTOR_WIZARD_STEP_IDS)[number];

export const TUTOR_WIZARD_OPTIONAL_STEPS = new Set<TutorWizardStepId>([
  "details",
  "schedule",
  "contact",
  "verify",
]);

/**
 * Resume at the first incomplete required step.
 * Optional steps (details / schedule / contact / verify) are never forced on resume —
 * tutors land on Save and can jump back, or Skip when they open them.
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

  return "finish";
}
