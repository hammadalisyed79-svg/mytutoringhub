import {
  isTutorCityComplete,
  type TutorProfileCompletionInput,
} from "@/lib/tutor-profile-completion";

/** Setup tutor profile — 5 required steps inside block 1. */
export const TUTOR_WIZARD_STEP_IDS = [
  "photo",
  "basics",
  "place",
  "teaching",
  "finish",
] as const;

/** Optional profile segments — each is its own workspace block after Teaching Profiles. */
export const TUTOR_WIZARD_EXTRA_IDS = [
  "details",
  "schedule",
  "contact",
  "verify",
] as const;

export type TutorWizardStepId = (typeof TUTOR_WIZARD_STEP_IDS)[number];
export type TutorWizardExtraId = (typeof TUTOR_WIZARD_EXTRA_IDS)[number];

/** Top-level profile workspace: 6 blocks in order. */
export const TUTOR_WORKSPACE_BLOCK_IDS = [
  "setup",
  "subjects",
  "details",
  "schedule",
  "contact",
  "verify",
] as const;

export type TutorWorkspaceBlockId = (typeof TUTOR_WORKSPACE_BLOCK_IDS)[number];

export const TUTOR_WORKSPACE_BLOCKS: {
  id: TutorWorkspaceBlockId;
  number: number;
  title: string;
  shortTitle: string;
  hint: string;
  optional: boolean;
}[] = [
  {
    id: "setup",
    number: 1,
    title: "Tutor profile",
    shortTitle: "Profile",
    hint: "Photo, about you, location, qualifications",
    optional: false,
  },
  {
    id: "subjects",
    number: 2,
    title: "Teaching Profiles",
    shortTitle: "Subjects",
    hint: "Subjects you teach in search",
    optional: false,
  },
  {
    id: "details",
    number: 3,
    title: "Teaching details",
    shortTitle: "Details",
    hint: "Expertise, levels, languages",
    optional: true,
  },
  {
    id: "schedule",
    number: 4,
    title: "Schedule",
    shortTitle: "Schedule",
    hint: "Weekly availability",
    optional: true,
  },
  {
    id: "contact",
    number: 5,
    title: "Contact & video",
    shortTitle: "Contact",
    hint: "Private phone and intro video",
    optional: true,
  },
  {
    id: "verify",
    number: 6,
    title: "ID verification",
    shortTitle: "Verify",
    hint: "Optional trust badge",
    optional: true,
  },
];

/** @deprecated Optional steps removed from the main path; kept empty for callers. */
export const TUTOR_WIZARD_OPTIONAL_STEPS = new Set<TutorWizardStepId>();

/**
 * Resume at the first incomplete required setup step.
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

/** Which of the 6 workspace blocks to open first. */
export function resolveTutorWorkspaceBlock(opts: {
  verifyRequested?: boolean;
  setupComplete: boolean;
  hasTeachingProfile: boolean;
  startExtra?: TutorWizardExtraId | null;
}): TutorWorkspaceBlockId {
  if (opts.verifyRequested) return "verify";
  if (opts.startExtra && (TUTOR_WIZARD_EXTRA_IDS as readonly string[]).includes(opts.startExtra)) {
    return opts.startExtra;
  }
  if (!opts.setupComplete) return "setup";
  if (!opts.hasTeachingProfile) return "subjects";
  return "setup";
}
