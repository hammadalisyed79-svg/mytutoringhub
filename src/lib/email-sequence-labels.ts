import { EMAIL_SEQUENCES } from "@/lib/email-sequences";
import { NURTURE_SEQUENCES } from "@/lib/email-nurture";

export const EMAIL_SEQUENCE_LABELS: Record<string, string> = {
  [EMAIL_SEQUENCES.POST_VERIFY]: "Post-verify welcome",
  [EMAIL_SEQUENCES.TUTOR_PICKS]: "Suggested tutors (student)",
  [EMAIL_SEQUENCES.UPGRADE_NUDGE]: "Student upgrade nudge",
  [EMAIL_SEQUENCES.VERIFY_REMINDER]: "Email verify reminder",
  [NURTURE_SEQUENCES.TUTOR_PROFILE_R1]: "Tutor profile reminder 1",
  [NURTURE_SEQUENCES.TUTOR_PROFILE_R2]: "Tutor profile reminder 2",
  [NURTURE_SEQUENCES.TUTOR_PROFILE_R3]: "Tutor profile reminder 3",
  [NURTURE_SEQUENCES.TUTOR_PROFILE_R4]: "Tutor profile reminder 4",
  [NURTURE_SEQUENCES.TUTOR_PROFILE_NEVER_STARTED]: "Tutor profile never started",
  [NURTURE_SEQUENCES.TUTOR_PROFILE_LIVE]: "Profile live congratulations",
  [NURTURE_SEQUENCES.TUTOR_PLAN_NUDGE]: "Tutor Basic nudge",
  [NURTURE_SEQUENCES.TUTOR_VERIFY_NUDGE]: "ID verification nudge",
  [NURTURE_SEQUENCES.STUDENT_BROWSE_R1]: "Student browse nudge 1",
  [NURTURE_SEQUENCES.STUDENT_BROWSE_R2]: "Student browse nudge 2",
  [NURTURE_SEQUENCES.STUDENT_POST_AD_R1]: "Post a request nudge 1",
  [NURTURE_SEQUENCES.STUDENT_POST_AD_R2]: "Post a request nudge 2",
  [NURTURE_SEQUENCES.STUDENT_REFERRAL_NUDGE]: "Referral invite nudge",
  [NURTURE_SEQUENCES.VERIFY_REMINDER_7]: "Verify email (day 7)",
};

export const PROFILE_NURTURE_SEQUENCES = [
  NURTURE_SEQUENCES.TUTOR_PROFILE_NEVER_STARTED,
  NURTURE_SEQUENCES.TUTOR_PROFILE_R1,
  NURTURE_SEQUENCES.TUTOR_PROFILE_R2,
  NURTURE_SEQUENCES.TUTOR_PROFILE_R3,
  NURTURE_SEQUENCES.TUTOR_PROFILE_R4,
  NURTURE_SEQUENCES.TUTOR_PROFILE_LIVE,
  NURTURE_SEQUENCES.TUTOR_PLAN_NUDGE,
  NURTURE_SEQUENCES.TUTOR_VERIFY_NUDGE,
] as const;

export function emailSequenceLabel(sequence: string) {
  return EMAIL_SEQUENCE_LABELS[sequence] || sequence;
}
