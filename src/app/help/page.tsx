import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { BUSINESS } from "@/lib/business-rules";
import { faqPageJsonLd, pageMetadata } from "@/lib/seo";
import {
  STUDENT_FREE_CONTACTS_LINE,
  TUTOR_FREE_LISTING_LINE,
  TUTOR_PRO_LAUNCH_OFFER_LINE,
} from "@/lib/marketing-copy";

export const metadata = pageMetadata({
  title: "Help & FAQ – Contacting Tutors, Plans & Payments",
  description:
    "Answers about finding tutors, Student Pass, Tutor Pro, Safepay billing, email verification, and safety on My Tutoring Hub.",
  path: "/help",
});

type FaqItem = { q: string; a: string };

const CATEGORIES: { id: string; title: string; items: FaqItem[] }[] = [
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

const ALL_FAQS = CATEGORIES.flatMap((c) => c.items);

export default function HelpPage() {
  return (
    <div className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...faqPageJsonLd(ALL_FAQS),
        }}
      />
      <div className="container narrow-prose">
        <h1 className="page-title">Help & FAQ</h1>
        <p className="section-lead">Quick answers by topic. Expand a question to read more.</p>

        <nav className="help-toc" aria-label="Help topics">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`#help-${c.id}`}>
              {c.title}
            </a>
          ))}
        </nav>

        {CATEGORIES.map((cat) => (
          <section key={cat.id} id={`help-${cat.id}`} style={{ marginTop: "1.75rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>{cat.title}</h2>
            <div className="faq-list">
              {cat.items.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <p className="muted" style={{ marginTop: "1.5rem" }}>
          <Link href="/support" className="btn btn-sm">
            Chat with AI support
          </Link>
        </p>
        <p className="muted" style={{ marginTop: "0.85rem" }}>
          Still stuck? <Link href="/contact">Contact</Link> ·{" "}
          <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> ·{" "}
          <Link href="/free-vs-paid">Free vs paid</Link> · <Link href="/pricing">View plans</Link>
        </p>
      </div>
    </div>
  );
}
