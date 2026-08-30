export type Role = "STUDENT" | "TUTOR" | "ADMIN";
export type SubscriptionPlan =
  | "STUDENT_PASS"
  | "STUDENT_PRO"
  | "TUTOR_BASIC"
  | "VERIFIED_TUTOR"
  | "HIGHLIGHTED_AD"
  | "AD_BOOST"
  | "EXTRA_PROFILE_ADS"
  | "UNLIMITED_ADS";
export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "TRIALING";
export type AdStatus = "OPEN" | "CLOSED" | "HIDDEN";
export type TutorAdStatus = "ACTIVE" | "PAUSED" | "HIDDEN";
export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

/** @deprecated Use PAID_SUBJECT_PROFILE_CAP from subject-profile-entitlements. */
export const FREE_TUTOR_AD_CAP = 1;
