/**
 * Canonical Help FAQ — shared by /help (UI + JSON-LD) and the Support AI prompt.
 * Keep commercial claims aligned with marketing-copy / business-rules / free-vs-paid.
 */
import { BUSINESS } from "@/lib/business-rules";
import {
  IDENTITY_VERIFIED_LINE,
  STUDENT_FREE_CONTACTS_LINE,
  STUDENT_PASS_PAPERS_LINE,
  STUDENT_REQUESTS_LINE,
  TUTOR_FREE_LISTING_LINE,
  TUTOR_GO_LIVE_REQUIREMENTS_LINE,
  TUTOR_PRO_PUBLIC_LINE,
} from "@/lib/marketing-copy";

export type HelpFaqItem = { q: string; a: string };

export type HelpFaqCategory = {
  id: string;
  title: string;
  blurb?: string;
  items: HelpFaqItem[];
};

export const HELP_FAQ_CATEGORIES: HelpFaqCategory[] = [
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "What My Tutoring Hub is and how to begin.",
    items: [
      {
        q: "What is My Tutoring Hub?",
        a: "My Tutoring Hub is a marketplace that connects students and parents with independent private tutors worldwide. You can search tutors, message them on the platform, browse exam past papers, and use study tools. We are not a tuition centre — lesson schedules and lesson fees are arranged directly between you and the tutor.",
      },
      {
        q: "How do I get started as a student?",
        a: `Create a free student account, search Find tutors by subject, location, or level, open a Teaching Profile you like, and send a message. ${STUDENT_FREE_CONTACTS_LINE} Arrange schedule and lesson payment directly with the tutor.`,
      },
      {
        q: "How do I get started as a tutor?",
        a: `Create a free tutor account, complete your profile, and publish ${BUSINESS.tutorFreeActiveListings} Teaching Profile to appear in search. ${TUTOR_GO_LIVE_REQUIREMENTS_LINE} ${TUTOR_FREE_LISTING_LINE}`,
      },
      {
        q: "Do you take a commission on lessons?",
        a: "No. Lesson fees stay between the student and the tutor. My Tutoring Hub only charges for platform subscriptions and optional visibility tools — never a cut of lessons.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & email",
    blurb: "Sign-up, verification, and account access.",
    items: [
      {
        q: "Which email can I use to sign up?",
        a: "Any working mailbox — Gmail, Hotmail, Outlook, Yahoo, and others. Optional Google sign-in is a shortcut for Google accounts.",
      },
      {
        q: "Where do confirmation emails come from?",
        a: "Verification links, sign-in notices, and receipts come from admin@mytutoringhub.com. Check inbox, junk, spam, and promotions folders.",
      },
      {
        q: "Why do I need to verify my email?",
        a: "You can use your dashboard immediately. Students need a verified email to start conversations and post Tutor Requests. Tutors need a verified email to start new conversations, but can still reply to inbound student messages before verifying. Resend the link from Pricing, Dashboard, or Settings.",
      },
      {
        q: "I did not get the verification email. What should I do?",
        a: "Wait a few minutes, check junk and promotions, then use Resend verification from Dashboard, Pricing, or Settings. Make sure you signed up with the correct address. If it still does not arrive, email admin@mytutoringhub.com from that same address.",
      },
      {
        q: "Can I change my name, password, or email?",
        a: "Yes. Open Settings to update your display name and password. For email changes or account access problems, contact admin@mytutoringhub.com from the address on your account.",
      },
      {
        q: "What if my account is suspended?",
        a: "Suspended accounts cannot use messaging or public listing features. Email admin@mytutoringhub.com from the address on the account with a short explanation. We review each case manually.",
      },
    ],
  },
  {
    id: "finding",
    title: "Students: finding tutors",
    blurb: "Search, messaging limits, reviews, and Tutor Requests.",
    items: [
      {
        q: "How do I find a tutor?",
        a: "Use Find tutors to search by subject, city or country, level, and keywords (for example Biology or Biology/Life Sciences). Open a Teaching Profile to read about the tutor, rates, and teaching options, then send a message.",
      },
      {
        q: "How do I contact a tutor?",
        a: `Browse Find tutors, open a Teaching Profile, and send a message. ${STUDENT_FREE_CONTACTS_LINE} Replies inside conversations you already started do not use a new contact.`,
      },
      {
        q: "What counts as a new tutor contact?",
        a: `Starting a brand-new message thread with a tutor you have not contacted before this month. Continuing an existing conversation does not count toward the free monthly limit.`,
      },
      {
        q: "What is a Tutor Request?",
        a: `${STUDENT_REQUESTS_LINE} Matching tutors can reply so you hear from people who fit your brief.`,
      },
      {
        q: "How do reviews work?",
        a: "Students who have messaged a tutor can leave a review after the conversation is at least 12 hours old. Reviews are moderated before they appear publicly. Reviews reflect messaging experiences on the platform — lesson payments happen directly between student and tutor, so My Tutoring Hub does not verify that a paid lesson took place.",
      },
      {
        q: "Who sets lesson fees and schedules?",
        a: "You and the tutor agree together. Rates on Teaching Profiles are a guide. Lesson fees are never billed through Safepay and are never processed through Safepay.",
      },
    ],
  },
  {
    id: "teaching",
    title: "Tutors: listing & Teaching Profiles",
    blurb: "Going live, free listing, Tutor Pro, and boosts.",
    items: [
      {
        q: "What do I need before students can find me?",
        a: TUTOR_GO_LIVE_REQUIREMENTS_LINE,
      },
      {
        q: "What is a Teaching Profile?",
        a: "Each subject you teach (for example Mathematics or Biology) is one Teaching Profile, with boards, levels, qualifications, and syllabus details as capabilities. Students see a search card for that subject. Your photo, Identity Verified badge, and reviews stay shared on your master tutor profile.",
      },
      {
        q: "What does free listing include? What is Tutor Pro?",
        a: `Complete tutor profiles appear in search with ${BUSINESS.tutorFreeActiveListings} active Teaching Profile permanently. ${TUTOR_PRO_PUBLIC_LINE}`,
      },
      {
        q: "Can free tutors message students first?",
        a: `Yes, within a monthly limit. Free listed tutors get ${BUSINESS.tutorFreeEnquiryRevealsPerMonth} student contacts per month when messaging first. Tutor Pro unlocks unlimited student contacts when you message first. Replying to inbound student messages does not use that limit.`,
      },
      {
        q: "What is Listing Boost?",
        a: "Listing Boost is an optional paid visibility add-on for a Teaching Profile (30-day or 365-day options). It does not add more Teaching Profile capacity. Boost stays subordinate to subject relevance in search. Buy it from each Teaching Profile on your dashboard.",
      },
      {
        q: "Do I keep 100% of lesson fees?",
        a: "Yes. My Tutoring Hub never takes a commission on lessons. Platform subscriptions and add-ons fund messaging, search tools, and visibility — not a cut of your teaching income.",
      },
    ],
  },
  {
    id: "messaging",
    title: "Messaging",
    blurb: "Email verification, limits, and conversation rules.",
    items: [
      {
        q: "Do I need to verify my email to message?",
        a: "Students and tutors need a verified email to start new conversations. Tutors can reply to inbound student messages even before email verification.",
      },
      {
        q: "Why can’t I message a tutor?",
        a: `Common reasons: email not verified, free monthly contact limit reached, the tutor is not live in search, or the account is suspended. Check Dashboard and Settings, then upgrade to Student Pass for unlimited messaging if you have used your free contacts. ${STUDENT_FREE_CONTACTS_LINE}`,
      },
      {
        q: "Are messages private?",
        a: "Messages stay in your account conversations on My Tutoring Hub. Use Report on a profile or conversation if someone behaves inappropriately, or email admin@mytutoringhub.com. Never share passwords or payment card details in chat.",
      },
    ],
  },
  {
    id: "plans",
    title: "Plans & payments",
    blurb: "Student Pass, Student Pro, Tutor Pro, and Safepay billing.",
    items: [
      {
        q: "What is free vs paid?",
        a: `Search and join are free. ${STUDENT_FREE_CONTACTS_LINE} ${TUTOR_FREE_LISTING_LINE} We never take a lesson commission. See Free vs paid for full comparison tables.`,
      },
      {
        q: "What is the difference between Student Pass and Student Pro?",
        a: `Student Pass unlocks unlimited tutor messaging, Tutor Requests, and ${BUSINESS.studentPassPaperDownloadsPerMonth} past paper downloads per month. Student Pro includes everything in Pass plus unlimited eligible past paper downloads and the AI study assistant.`,
      },
      {
        q: "Do you take a commission on lessons?",
        a: "No. Lesson fees stay between you and the tutor. My Tutoring Hub only charges platform subscriptions and visibility upgrades.",
      },
      {
        q: "How do payments work?",
        a: "Platform plans are billed for the period you purchase through Safepay. Access remains active for the purchased period. Automatic renewal only applies if recurring billing is explicitly offered and authorized at checkout. Lesson payments are never processed through Safepay.",
      },
      {
        q: "Do plans auto-renew?",
        a: "Access remains active for the purchased period. Automatic renewal only applies if recurring billing is explicitly offered and authorized at checkout. To stop future renewals when recurring billing is on, email admin@mytutoringhub.com from your account address before the next billing date.",
      },
      {
        q: "Where do I see receipts?",
        a: "After a successful Safepay payment you see an on-screen receipt and receive a confirmation email from admin@mytutoringhub.com. Keep the Safepay tracker ID if you need billing help later.",
      },
      {
        q: "How do I upgrade or buy an add-on?",
        a: "Open Plans & pricing for Student Pass, Student Pro, or Tutor Pro. Tutors buy Listing Boost and Priority Verification Review from the tutor dashboard on each Teaching Profile. All platform products are billed securely through Safepay.",
      },
    ],
  },
  {
    id: "papers",
    title: "Past papers & study tools",
    blurb: "Exam papers, downloads, and the study assistant.",
    items: [
      {
        q: "How do Past Papers work?",
        a: `Browse by board and subject for free. ${STUDENT_PASS_PAPERS_LINE}`,
      },
      {
        q: "What is the Study assistant?",
        a: "Student Pro unlocks an AI study coach for students. Tutors and admins can use the study assistant free after email verification. Progress log and exam countdown are free browser tools (stored on your device). For human help, use Find tutors.",
      },
      {
        q: "Can I download papers on a free account?",
        a: "You can browse the library free. Downloads need Student Pass, Student Pro, or an individual paper purchase when offered. Guest visitors are prompted to sign in for included downloads.",
      },
    ],
  },
  {
    id: "verification",
    title: "Identity verification",
    blurb: "What Identity Verified means — and what it does not.",
    items: [
      {
        q: "What does Identity Verified mean?",
        a: `${IDENTITY_VERIFIED_LINE} Tutors upload a government photo ID. Admins review privately and then approve the badge.`,
      },
      {
        q: "Can I buy the Identity Verified badge?",
        a: "No. The badge is earned after a successful identity review. Priority Verification Review only prioritises the queue — it never auto-awards verification.",
      },
      {
        q: "How long does verification take?",
        a: "Reviews are handled manually. Standard queue times vary with volume. Priority Verification Review moves your submission earlier in the queue but still requires admin approval.",
      },
    ],
  },
  {
    id: "safety",
    title: "Safety & reports",
    blurb: "Reporting problems and getting human help.",
    items: [
      {
        q: "How do I report a problem?",
        a: "Use Report on a tutor profile or student request while signed in, or email admin@mytutoringhub.com with links, screenshots, and the email on your account.",
      },
      {
        q: "Is there live chat support?",
        a: "Log in and open Support for AI help with plans, verification, messaging, Teaching Profiles, past papers, and payments. For billing disputes, safety reports, or account recovery, email admin@mytutoringhub.com.",
      },
      {
        q: "What should I never share in messages?",
        a: "Do not share passwords, one-time codes, full payment card numbers, or government ID images in chat. Lesson fees are arranged privately with the tutor — use payment methods you trust.",
      },
    ],
  },
  {
    id: "policies",
    title: "Refunds & policies",
    blurb: "Cancellations, refunds, and legal pages.",
    items: [
      {
        q: "How do refunds and cancellations work?",
        a: "Platform subscriptions and past-paper purchases billed through Safepay are covered by our Refund & cancellation policy. Contact admin@mytutoringhub.com within 7 days for incorrect charges, failed activation after payment, or undeliverable paid downloads. Lesson fees paid to tutors are out of scope. See /refund for full details.",
      },
      {
        q: "Where are Terms and Privacy?",
        a: "Terms of Service are on /terms. Privacy Policy is on /privacy. Contact is on /contact. For the fastest help, include the email on your account in every message.",
      },
    ],
  },
];

export const ALL_HELP_FAQS: HelpFaqItem[] = HELP_FAQ_CATEGORIES.flatMap((c) => c.items);

/** Conversion-page FAQs for /pricing JSON-LD (subset; full tables live on /free-vs-paid). */
export const PRICING_FAQS: HelpFaqItem[] = [
  {
    q: "What do students pay for?",
    a: `${STUDENT_FREE_CONTACTS_LINE} Student Pass unlocks unlimited messaging, Tutor Requests, and ${BUSINESS.studentPassPaperDownloadsPerMonth} past paper downloads/month. Student Pro adds unlimited eligible past papers and the AI study assistant. Lesson fees stay between you and the tutor.`,
  },
  {
    q: "What do tutors pay for?",
    a: `${TUTOR_FREE_LISTING_LINE} ${TUTOR_PRO_PUBLIC_LINE}`,
  },
  {
    q: "Do plans auto-renew?",
    a: "Access remains active for the purchased period. Automatic renewal only applies if recurring billing is explicitly offered and authorized at checkout.",
  },
  {
    q: "Are lesson fees billed through Safepay?",
    a: "No. Safepay is only for platform products (plans, add-ons, past papers). Lesson fees are never processed through Safepay.",
  },
];

export const HOW_IT_WORKS_FAQS: HelpFaqItem[] = [
  {
    q: "How do students find a tutor?",
    a: "Search by subject, location, and level on Find tutors, open a Teaching Profile, and send a message. Arrange schedule and lesson payment directly with the tutor.",
  },
  {
    q: "How do tutors get started?",
    a: `Create an account, publish ${BUSINESS.tutorFreeActiveListings} free active Teaching Profile when your profile is complete, then reply to student messages. Keep 100% of lesson fees.`,
  },
  {
    q: "Does My Tutoring Hub take a lesson commission?",
    a: "No. Platform subscriptions fund messaging and tools — lesson fees stay between student and tutor.",
  },
];

/** Compact policy facts for Support AI (not legal advice; point to /refund /terms). */
export const POLICY_KNOWLEDGE_BULLETS = [
  "Refunds & cancellations: /refund — covers platform subscriptions and past-paper purchases billed via Safepay; lesson fees with tutors are out of scope.",
  "Digital delivery is immediate after successful payment (receipt on screen + email from admin@mytutoringhub.com).",
  "Access remains active for the purchased period; auto-renew only if authorized at checkout.",
  "Terms: /terms · Privacy: /privacy · Contact: /contact · Help FAQ: /help.",
  "About: marketplace connecting students with independent tutors worldwide — not a tuition centre.",
] as const;
