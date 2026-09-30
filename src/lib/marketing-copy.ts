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

/** One sentence for dashboards, emails, and status — what unlocks search + inbound messages. */
export const TUTOR_GO_LIVE_REQUIREMENTS_LINE =
  "Go live with a photo, about you, location, qualifications, and one Teaching Profile (subject, rate, and online or in person). Students can’t message you until you’re live in search.";

export const TUTOR_FREE_LISTING_LINE =
  `Complete your profile — including one Teaching Profile — to appear in search and receive student messages for free. Free tutors get ${BUSINESS.tutorFreeActiveListings} active Teaching Profile, enquiries, and 100% of lesson fees. Tutor Pro unlocks up to ${BUSINESS.tutorProActiveListings} active Teaching Profiles plus growth tools.`;

export const TUTOR_PRO_LISTING_LINE =
  `Tutor Pro includes up to ${BUSINESS.tutorProActiveListings} active Teaching Profiles, relevance-first ranking among matching students, and unlimited student contacts when you message first.`;

/** @deprecated Launch offer ended 30 Sep 2026 — kept for admin/receipt history only. */
export const TUTOR_PRO_LAUNCH_OFFER_LABEL = "Launch offer";

/** Inclusive end date — historical; do not surface on public acquisition pages. */
export const TUTOR_PRO_LAUNCH_OFFER_UNTIL = "30 September 2026";

/** Benefits that were included free while the Launch offer was active. */
export const TUTOR_PRO_LAUNCH_BENEFITS = [
  `Up to ${BUSINESS.tutorProActiveListings} active Teaching Profiles`,
  "Relevance-first ranking among matching students",
  "Unlimited student contacts when you message students first",
] as const;

/**
 * Public one-liner for Tutor Pro — list price only (Launch offer ended; do not re-add promo claims).
 */
export const TUTOR_PRO_PUBLIC_LINE =
  `Tutor Pro includes up to ${BUSINESS.tutorProActiveListings} active Teaching Profiles, relevance-first ranking, and unlimited student contacts when you message first. Free listing includes ${BUSINESS.tutorFreeActiveListings} active Teaching Profile permanently. Listing Boost and Priority Verification Review are separate paid add-ons.`;

/** @deprecated Prefer TUTOR_PRO_PUBLIC_LINE for public pages. */
export const TUTOR_PRO_LAUNCH_OFFER_LINE = TUTOR_PRO_PUBLIC_LINE;

export const IDENTITY_VERIFIED_LINE =
  "Identity Verified means a successful identity review — not a qualification, degree, quality, or background check. The badge is earned, not purchased; Priority Verification Review only jumps the queue.";

export const PAST_PAPERS_ENTITLEMENT_LINE =
  "Browse past papers free. Student Pass includes 10 downloads per month; Student Pro includes unlimited eligible downloads. Individual papers may also be purchased separately when offered.";

export const GEO_CURRENCY_LINE =
  "Rates shown in your local currency · tutors online or in your city · GCSE, IGCSE, A-Level, Matric, and more";

export const STUDENT_REQUESTS_LINE =
  "Post a Tutor Request — matching tutors can reply. Student Pass is required to post requests.";

export const EXAM_PREP_CTA =
  `Exams coming up? Student Pass unlocks unlimited tutor messages and ${BUSINESS.studentPassPaperDownloadsPerMonth} past paper downloads per month. Student Pro adds unlimited eligible papers and the AI study assistant.`;

/** Canonical guest/signed-out past-paper purchase hint (Student Pass is paid). */
export const PAST_PAPER_SIGN_IN_DOWNLOADS_LINE =
  "Sign in with Student Pass or Pro for included downloads. Student Pass includes 10 eligible downloads per month.";

/** Soft invite — no Hub Points / referral rewards promotion on public sales surfaces. */
export const REFERRAL_LINE =
  "Invite a friend to My Tutoring Hub — they can search free and message tutors within the free contact limit.";

export const TUTOR_INVITE_LINE =
  "Know a tutor? Share your link — free listing (1 active Teaching Profile), no commission on lessons. They appear in search worldwide.";

export const HOMEPAGE_PRODUCT_TRIO =
  "Find tutors. Prepare with past papers. Get smarter study support.";

export const HOMEPAGE_PRODUCT_TRIO_LEAD =
  "A marketplace for private tutors, exam past papers, and study tools — not just another tutor directory.";

/** @deprecated Prefer findTutorCtaCopy from business-rules — kept for gradual migration. */
export function subjectTutorContactLine() {
  return studentContactRuleShort();
}

export { NO_LESSON_COMMISSION_LINE, NO_LESSON_COMMISSION_SHORT };
