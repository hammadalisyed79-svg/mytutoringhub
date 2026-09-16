/**
 * Canonical Help FAQ — shared by /help (UI + JSON-LD) and the Support AI prompt.
 * Keep commercial claims aligned with marketing-copy / business-rules / free-vs-paid.
 */
import { BUSINESS } from "@/lib/business-rules";
import {
  STUDENT_FREE_CONTACTS_LINE,
  TUTOR_FREE_LISTING_LINE,
  TUTOR_PRO_LAUNCH_OFFER_LINE,
} from "@/lib/marketing-copy";

export type HelpFaqItem = { q: string; a: string };

export type HelpFaqCategory = {
  id: string;
  title: string;
  items: HelpFaqItem[];
};

export const HELP_FAQ_CATEGORIES: HelpFaqCategory[] = [
  {
    id: "account",
    title: "Account",
    items: [
      {
        q: "Which email can I use to sign up?",
        a: "Any working mailbox — Gmail, Hotmail, Outlook, Yahoo, and others. Optional Google sign-in is a shortcut for Gmail accounts.",
      },
      {
        q: "Where do confirmation emails come from?",
        a: "Verification, sign-in notices, and receipts come from admin@mytutoringhub.com. Check inbox, junk, and promotions.",
      },
      {
        q: "Why do I need to verify my email?",
        a: "You can use your dashboard immediately, but messaging and student requests stay locked until you confirm. Resend the link from Pricing, Dashboard, or Settings.",
      },
    ],
  },
  {
    id: "finding",
    title: "Finding tutors",
    items: [
      {
        q: "How do I contact a tutor?",
        a: `Browse Find tutors, open a Teaching Profile, and send a message. ${STUDENT_FREE_CONTACTS_LINE}`,
      },
      {
        q: "How do reviews work?",
        a: "Students who have messaged a tutor can leave a review after the conversation is at least 12 hours old. Reviews may be moderated before they appear publicly.",
      },
    ],
  },
  {
    id: "teaching",
    title: "Teaching",
    items: [
      {
        q: "Is Tutor Pro free?",
        a: `Complete tutor profiles appear in search with ${BUSINESS.tutorFreeActiveListings} active Teaching Profile permanently. ${TUTOR_PRO_LAUNCH_OFFER_LINE}`,
      },
      {
        q: "What does Identity Verified mean?",
        a: "Identity Verified tutors upload a government photo ID. Admins review privately and then approve the badge. You cannot buy the badge; Priority Verification Review only prioritises the queue.",
      },
    ],
  },
  {
    id: "plans",
    title: "Plans & payments",
    items: [
      {
        q: "What is free vs paid?",
        a: `Search and join are free. ${STUDENT_FREE_CONTACTS_LINE} ${TUTOR_FREE_LISTING_LINE} We never take a lesson commission. See Free vs paid for full tables.`,
      },
      {
        q: "Do you take a commission on lessons?",
        a: "No. Lesson fees stay between you and the tutor. My Tutoring Hub only charges platform subscriptions and visibility upgrades.",
      },
      {
        q: "How do payments work?",
        a: "Platform plans are billed for the period you purchase through Safepay when live. Access remains active for the purchased period. Automatic renewal only applies if recurring billing is explicitly offered and authorized at checkout. Lesson payments are never processed through Safepay.",
      },
    ],
  },
  {
    id: "papers",
    title: "Past Papers",
    items: [
      {
        q: "How do Past Papers work?",
        a: "Browse by board and subject. Buy a single paper, or use Student Pass (10 eligible downloads/month) or Student Pro (unlimited eligible downloads).",
      },
      {
        q: "What is the Study assistant?",
        a: "Student Pro unlocks an AI study coach. Progress log and exam countdown are free browser tools. For human help, use Find tutors.",
      },
    ],
  },
  {
    id: "safety",
    title: "Safety",
    items: [
      {
        q: "How do I report a problem?",
        a: "Use Report on a tutor profile or student request, or email admin@mytutoringhub.com.",
      },
      {
        q: "Is there live chat support?",
        a: "Log in and open Support for AI help with plans, verification, messaging, and payments. For complex issues, email admin@mytutoringhub.com.",
      },
    ],
  },
];

export const ALL_HELP_FAQS: HelpFaqItem[] = HELP_FAQ_CATEGORIES.flatMap((c) => c.items);

/** Conversion-page FAQs for /pricing JSON-LD (subset; full tables live on /free-vs-paid). */
export const PRICING_FAQS: HelpFaqItem[] = [
  {
    q: "What do students pay for?",
    a: `${STUDENT_FREE_CONTACTS_LINE} Student Pass unlocks unlimited messaging, request ads, and 10 past paper downloads/month. Student Pro adds unlimited eligible past papers and the AI study assistant. Lesson fees stay between you and the tutor.`,
  },
  {
    q: "What do tutors pay for?",
    a: `${TUTOR_FREE_LISTING_LINE} Tutor Pro adds capacity, ranking, and unlimited student contacts when you message first. Listing Boost and Priority Verification Review are optional add-ons. ${TUTOR_PRO_LAUNCH_OFFER_LINE}`,
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
