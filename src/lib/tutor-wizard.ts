import {
  isTutorCityComplete,
  type TutorProfileCompletionInput,
} from "@/lib/tutor-profile-completion";

/** Main setup path only — extras live as collapsed blocks on Save. */
export const TUTOR_WIZARD_STEP_IDS = [
  "photo",
  "basics",
  "place",
  "teaching",
  "finish",
] as const;

/** Optional profile segments — not sequential wizard steps. */
export const TUTOR_WIZARD_EXTRA_IDS = [
  "details",
  "schedule",
  "contact",
  "verify",
] as const;

export type TutorWizardStepId = (typeof TUTOR_WIZARD_STEP_IDS)[number];
export type TutorWizardExtraId = (typeof TUTOR_WIZARD_EXTRA_IDS)[number];

/** @deprecated Optional steps removed from the main path; kept empty for callers. */
export const TUTOR_WIZARD_OPTIONAL_STEPS = new Set<TutorWizardStepId>();

/**
 * Resume at the first incomplete required step.
 * Extras never block resume — tutors land on Save when required fields are done.
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
