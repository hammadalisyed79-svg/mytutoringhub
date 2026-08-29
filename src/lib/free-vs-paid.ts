import {
  REFERRAL_LINE,
  STUDENT_FREE_CONTACTS_LINE,
  STUDENT_PASS_PAPERS_LINE,
  TUTOR_FREE_LISTING_LINE,
  VALUE_PROPOSITION,
} from "@/lib/marketing-copy";
import {
  STUDENT_FREE_CONTACT_LIMIT,
  TUTOR_FREE_REVEAL_LIMIT,
} from "@/lib/plan-limits";

export const FREE_VS_PAID_INTRO =
  "My Tutoring Hub is free to join. You only pay for platform tools — never a commission on lesson fees.";

export const LESSON_FEES_LINE =
  "Lesson fees are always arranged directly between student and tutor. We never take a cut.";

export type CompareCell = "yes" | "no" | "limited" | string;

export type CompareRow = {
  feature: string;
  free: CompareCell;
  paid: CompareCell;
  detail?: string;
};

export const STUDENT_COMPARE_ROWS: CompareRow[] = [
  {
    feature: "Search & browse tutors",
    free: "yes",
    paid: "yes",
  },
  {
    feature: "New tutor contacts per month",
    free: "limited",
    paid: "Unlimited",
    detail: `Free accounts get ${STUDENT_FREE_CONTACT_LIMIT} new contacts/month. ${REFERRAL_LINE}`,
  },
  {
    feature: "Reply in existing message threads",
    free: "yes",
    paid: "yes",
  },
  {
    feature: "Post “need a tutor” request ads",
    free: "no",
    paid: "yes",
    detail: "Requires Student Pass or Student Pro.",
  },
  {
    feature: "Past paper downloads",
    free: "Browse library",
    paid: `10/mo (Pass) · unlimited (Pro)`,
    detail: STUDENT_PASS_PAPERS_LINE,
  },
  {
    feature: "AI study assistant",
    free: "no",
    paid: "Student Pro",
  },
  {
    feature: "Exam countdown & study progress",
    free: "yes",
    paid: "yes",
    detail: "Free browser tools — no cloud sync.",
  },
  {
    feature: "Commission on lessons",
    free: "Never",
    paid: "Never",
    detail: LESSON_FEES_LINE,
  },
];

export const TUTOR_COMPARE_ROWS: CompareRow[] = [
  {
    feature: "Appear in tutor search",
    free: "yes",
    paid: "yes",
    detail: TUTOR_FREE_LISTING_LINE,
  },
  {
    feature: "Receive & reply to student messages",
    free: "yes",
    paid: "yes",
    detail: "Tutors can reply to inbound messages even before email verification.",
  },
  {
    feature: "Subject profiles in search",
    free: "2 until 30 Sep",
    paid: "Up to 3 / unlimited",
    detail:
      "2 free teaching listings until 30 Sep 2026; more need Tutor Pro (or a legacy listing pack). From 1 Oct 2026: 0 free — all listings require a plan (up to 3 on Tutor Pro / Extra; unlimited on legacy Unlimited Profiles).",
  },
  {
    feature: "Priority search ranking",
    free: "no",
    paid: "yes",
    detail: "Tutor Pro improves placement among relevant matches (boost stays below strong subject fit).",
  },
  {
    feature: "Student enquiry reveals per month",
    free: "limited",
    paid: "Unlimited",
    detail: `Free tutors get ${TUTOR_FREE_REVEAL_LIMIT} reveals/month when messaging students first.`,
  },
  {
    feature: "AI study assistant",
    free: "yes",
    paid: "yes",
    detail: "Free for tutors with a verified email.",
  },
  {
    feature: "Verified badge",
    free: "Earned",
    paid: "Priority review",
    detail:
      "Badge is earned only after successful identity review. Optional Priority Verification Review jumps the queue — you cannot buy the badge.",
  },
  {
    feature: "Listing Boost",
    free: "no",
    paid: "Per teaching listing",
    detail: "Optional 30-day Listing Boost (legacy Highlight still honourable). Buy from each listing on your dashboard.",
  },
  {
    feature: "Commission on lessons",
    free: "Never",
    paid: "Never",
    detail: LESSON_FEES_LINE,
  },
];

export const ALWAYS_FREE_HIGHLIGHTS = [
  "Search tutors worldwide — no signup fee",
  "Create a student or tutor account for free",
  "Reply in conversations you already started",
  "Rates shown in your local currency",
  "No commission on lesson fees — ever",
] as const;

export const STUDENT_PAID_HIGHLIGHTS = [
  "Student Pass — unlimited messaging, request ads, 10 past papers/month",
  "Student Pro — everything in Pass, plus unlimited papers & AI study coach",
] as const;

export const TUTOR_PAID_HIGHLIGHTS = [
  "Tutor Pro — priority ranking, unlimited reveals, up to 3 teaching listings (complimentary until 30 Sept 2026)",
  "Optional — Listing Boost per teaching listing; Priority Verification Review (badge only after approval)",
] as const;

export const FREE_VS_PAID_FAQS = [
  {
    q: "Do I have to pay to find a tutor?",
    a: `No. Searching, browsing profiles, and reading reviews are free. ${STUDENT_FREE_CONTACTS_LINE} You can keep replying in chats you already have without using a new contact.`,
  },
  {
    q: "What counts as a “new tutor contact”?",
    a: `Starting a brand-new message thread with a tutor you have not contacted before this month. Replies inside existing conversations do not count toward the ${STUDENT_FREE_CONTACT_LIMIT}-contact free limit.`,
  },
  {
    q: "Do tutors pay to be listed?",
    a: `No. A complete profile (photo, subjects, headline, and bio) appears in search for free. ${TUTOR_FREE_LISTING_LINE}`,
  },
  {
    q: "Is Tutor Pro really free right now?",
    a: "Yes — Tutor Pro (internally still Tutor Basic) is complimentary until 30 September 2026 (priority placement and unlimited enquiry reveals). Until then every tutor also gets 2 free teaching listings; more need Tutor Pro or a legacy listing pack. From 1 October 2026 teaching listings require a plan (0 free). Listing Boost is optional. The Verified badge is earned via identity review — Priority Verification Review only jumps the queue.",
  },
  {
    q: "What is a teaching listing?",
    a: "Each subject you teach (Maths, Physics, …) can be its own search listing with its own rate, city, and boost. Students see separate cards; your photo, verification, and reviews stay shared on your master profile.",
  },
  {
    q: "Does My Tutoring Hub take a cut of lessons?",
    a: LESSON_FEES_LINE,
  },
  {
    q: "What is the difference between Student Pass and Student Pro?",
    a: "Student Pass unlocks unlimited tutor messaging, student request ads, and 10 past paper downloads per month. Student Pro includes everything in Pass plus unlimited past paper downloads and the AI study assistant.",
  },
  {
    q: "Can I use the study assistant on a free account?",
    a: "Students need Student Pro. Tutors and admins can use it free after email verification. Exam countdown and study progress logs are free for everyone (stored in your browser).",
  },
  {
    q: "How do I upgrade?",
    a: "Open Plans & pricing, choose Student Pass, Student Pro, or Tutor Pro, and pay on Safepay when checkout is live. Until then, complimentary Tutor Pro and manual plan activation by email are available. Listing Boost is purchased from each teaching listing on your tutor dashboard.",
  },
] as const;

export const FREE_VS_PAID_META = {
  title: "Free vs Paid – What’s Included on My Tutoring Hub",
  description: `${VALUE_PROPOSITION} Compare free student and tutor features with Student Pass, Student Pro, and Tutor Pro.`,
  path: "/free-vs-paid",
} as const;
