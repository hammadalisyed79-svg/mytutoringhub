/** Canonical marketing messages — keep wording consistent sitewide. */

import {
  BUSINESS,
  NO_LESSON_COMMISSION_LINE,
  NO_LESSON_COMMISSION_SHORT,
  studentContactRuleShort,
} from "@/lib/business-rules";

export const VALUE_PROPOSITION = `Find tutors free. Free accounts include ${BUSINESS.studentFreeContactsPerMonth} new tutor contacts per month — upgrade for unlimited messaging and study tools. Lesson fees stay between you and the tutor.`;

/** Inline phrase for CTAs, e.g. "3 contacts/month". */
export function studentFreeContactsShort() {
  return `${BUSINESS.studentFreeContactsPerMonth} contacts/month`;
}

/** Sentence fragment: "3 new tutor contacts per month". */
export function studentFreeContactsPhrase() {
  return `${BUSINESS.studentFreeContactsPerMonth} new tutor contacts per month`;
}

export const VALUE_PROPOSITION_SHORT = `Search free · ${NO_LESSON_COMMISSION_SHORT} · Student Pass unlocks unlimited contacts`;

export const STUDENT_FREE_CONTACTS_LINE = `Free accounts include ${BUSINESS.studentFreeContactsPerMonth} new tutor contacts per month. Student Pass unlocks unlimited messaging.`;

export const STUDENT_PASS_PAPERS_LINE = `Student Pass includes ${BUSINESS.studentPassPaperDownloadsPerMonth} past paper downloads per month. Student Pro includes unlimited eligible downloads. Anyone can browse the library; individual papers can also be purchased separately when offered.`;

export const TUTOR_FREE_LISTING_LINE =
  `Complete your profile to appear in search for free. Free tutors get up to ${BUSINESS.tutorFreeActiveListings} active Teaching Profiles for different subjects, enquiries, and 100% of lesson fees — no subscription required for ordinary search visibility. Tutor Pro unlocks up to ${BUSINESS.tutorProActiveListings} Teaching Profiles plus growth tools.`;

export const TUTOR_PRO_LISTING_LINE =
  `Tutor Pro includes up to ${BUSINESS.tutorProActiveListings} active Teaching Profiles, relevance-first ranking enhancement, unlimited enquiry reveals, enhanced student-request access, and analytics.`;

export const IDENTITY_VERIFIED_LINE =
  "Identity Verified means a successful identity review — not a qualification, degree, quality, or background check. The badge is earned, not purchased; Priority Verification Review only jumps the queue.";

export const PAST_PAPERS_ENTITLEMENT_LINE =
  "Browse past papers free. Student Pass includes 10 downloads per month; Student Pro includes unlimited eligible downloads. Individual papers may also be purchased separately when offered.";

export const GEO_CURRENCY_LINE =
  "Rates shown in your local currency · tutors online or in your city · GCSE, IGCSE, A-Level, Matric, and more";

export const STUDENT_REQUESTS_LINE =
  "Post what you need — matching tutors can reply. Serious requests get faster responses with Student Pass.";

export const EXAM_PREP_CTA =
  "Exams coming up? Unlock unlimited tutor messages and past papers with Student Pass.";

export const REFERRAL_LINE =
  "Invite a friend — earn 50 Hub Points when they verify email and complete the referral milestone.";

export const TUTOR_INVITE_LINE =
  "Know a tutor? Share your link — free listing, no commission on lessons. They appear in search worldwide.";

export const HOMEPAGE_PRODUCT_TRIO =
  "Find tutors. Prepare with past papers. Get smarter study support.";

export const HOMEPAGE_PRODUCT_TRIO_LEAD =
  "A marketplace for private tutors, exam past papers, and study tools — not just another tutor directory.";

/** @deprecated Prefer findTutorCtaCopy from business-rules — kept for gradual migration. */
export function subjectTutorContactLine() {
  return studentContactRuleShort();
}

export { NO_LESSON_COMMISSION_LINE, NO_LESSON_COMMISSION_SHORT };
