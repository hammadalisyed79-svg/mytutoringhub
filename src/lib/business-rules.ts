/**
 * Canonical marketplace business rules for My Tutoring Hub.
 * Limits come from plan-limits / plans; marketing strings consume these helpers
 * so UI copy cannot drift from enforcement.
 */

import {
  STUDENT_FREE_CONTACT_LIMIT,
  STUDENT_PASS_PAPER_DOWNLOADS,
  TUTOR_FREE_REVEAL_LIMIT,
} from "@/lib/plan-limits";

export const BUSINESS = {
  studentFreeContactsPerMonth: STUDENT_FREE_CONTACT_LIMIT,
  studentPassPaperDownloadsPerMonth: STUDENT_PASS_PAPER_DOWNLOADS,
  tutorFreeEnquiryRevealsPerMonth: TUTOR_FREE_REVEAL_LIMIT,
  noLessonCommission: true,
  studentPassUnlimitedContacts: true,
  tutorFreeSearchWhenProfileComplete: true,
} as const;

/** Short contact rule for CTAs, meta, and subject pages. */
export function studentContactRuleShort() {
  return `Browse free and contact up to ${BUSINESS.studentFreeContactsPerMonth} new tutors per month free; Student Pass unlocks unlimited contacts.`;
}

/** Subject-aware tutor CTA body (past papers, subject landings). */
export function findTutorCtaCopy(subject: string) {
  const label = subject.trim() || "your subject";
  return `Find a private ${label} tutor. Browse free and contact up to ${BUSINESS.studentFreeContactsPerMonth} new tutors per month free; Student Pass unlocks unlimited contacts.`;
}

export function findTutorCtaMeta(subject: string, extra?: string) {
  const base = `Search ${subject} tutors free — ${BUSINESS.studentFreeContactsPerMonth} new contacts/month included. Student Pass unlocks unlimited messaging.`;
  return extra ? `${base} ${extra}` : base;
}

export const NO_LESSON_COMMISSION_LINE =
  "No commission on lesson fees — pay your tutor directly.";

export const NO_LESSON_COMMISSION_SHORT = "No commission on lesson fees";

export const TRUST_IDENTITY_VERIFICATION = "Identity verification available";

export const TRUST_COUNTRIES_BOARDS = "50+ countries & boards";
