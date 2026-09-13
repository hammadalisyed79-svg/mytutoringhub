import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { BUSINESS } from "@/lib/business-rules";
import { faqPageJsonLd, pageMetadata } from "@/lib/seo";
import { STUDENT_FREE_CONTACTS_LINE, TUTOR_FREE_LISTING_LINE, TUTOR_PRO_LAUNCH_OFFER_LINE } from "@/lib/marketing-copy";

export const metadata = pageMetadata({
  title: "Help & FAQ – Contacting Tutors, Plans & Payments",
  description:
    "Answers about finding tutors, Student Pass, Tutor Pro, Safepay billing, email verification, and safety on My Tutoring Hub.",
  path: "/help",
});

const FAQS = [
  {
    q: "What is free vs paid on My Tutoring Hub?",
    a: `Search and join are free. ${STUDENT_FREE_CONTACTS_LINE} ${TUTOR_FREE_LISTING_LINE} We never take a lesson commission. See the full Free vs paid guide for tables and FAQs.`,
  },
  {
    q: "How do I contact a tutor?",
    a: `Browse Find tutors, open a profile, and send a message. ${STUDENT_FREE_CONTACTS_LINE} Student Pass also unlocks request ads.`,
  },
  {
    q: "Which email can I use to sign up?",
    a: "Any working mailbox — Gmail, Hotmail, Outlook, Yahoo, and others. Optional Google sign-in is only a shortcut for Gmail accounts.",
  },
  {
    q: "Where do confirmation emails come from?",
    a: "My Tutoring Hub sends verification, sign-in notices, and receipts from admin@mytutoringhub.com. Check inbox, junk, and promotions.",
  },
  {
    q: "Do you take a commission on lessons?",
    a: "No. Lesson fees stay between you and the tutor. My Tutoring Hub only charges platform subscriptions and visibility upgrades.",
  },
  {
    q: "What is the Study assistant?",
    a: "Students with Student Pro (and tutors) can use an AI study coach for explanations and practice. It is not a live tutor and has a daily message limit. Progress log and exam countdown are free tools stored in this browser only (no cloud sync). For human help, search Find tutors.",
  },
  {
    q: "How do payments work?",
    a: "Platform plans (Student Pass, Student Pro, Tutor Pro) are billed for the period you purchase through Safepay when live. Access remains active for the purchased period. Automatic renewal only applies if recurring billing is explicitly offered and authorized at checkout. Listing Boost and Priority Verification Review are separate one-time paid products. Until card checkout is activated, the Tutor Pro Launch offer and free Teaching Profiles work without payment — email admin@mytutoringhub.com for manual plan activation. You receive a receipt email after a successful payment. Lesson payments are arranged privately and are never processed through Safepay.",
  },
  {
    q: "Is Tutor Pro free?",
    a: `Complete tutor profiles appear in search for free with ${BUSINESS.tutorFreeActiveListings} active Teaching Profile — permanently, not a temporary promo. ${TUTOR_PRO_LAUNCH_OFFER_LINE} Identity Verified is earned after identity review — Priority Verification Review only jumps the queue and never auto-awards the badge. Free students keep ${BUSINESS.studentFreeContactsPerMonth} new tutor contacts/month.`,
  },
  {
    q: "Why do I need to verify my email?",
    a: "After signup we send a confirmation link from admin@mytutoringhub.com. You can use your dashboard immediately, but messaging and student requests stay locked until you confirm. The AI study assistant also needs Student Pro. Resend the link from Pricing, Dashboard, or Settings.",
  },
  {
    q: "What does Identity Verified mean?",
    a: "Identity Verified tutors upload a government photo ID (passport, national ID / CNIC, or driving licence). A qualification certificate is recommended but Identity Verified does not mean qualification verified, degree verified, background checked, or quality approved. Admins review the files privately and then approve the badge. You cannot buy the badge; Priority Verification Review only prioritises the queue.",
  },
  {
    q: "How do reviews work?",
    a: "Students who have messaged a tutor can leave a review after the conversation is at least 12 hours old. Reviews may be moderated before they appear publicly.",
  },
  {
    q: "Is there live chat support?",
    a: "Log in and tap Support (bottom-right) or open /support for AI help with plans, verification, messaging, and payments. For complex issues, email admin@mytutoringhub.com.",
  },
  {
    q: "How do I report a problem?",
    a: "Use the Report button on a tutor profile or student ad, or email admin@mytutoringhub.com.",
  },
];

export default function HelpPage() {
  return (
    <div className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...faqPageJsonLd(FAQS),
        }}
      />
      <div className="container narrow-prose">
        <h1 className="page-title">Help & FAQ</h1>
        <p className="section-lead">
          Quick answers about contacting tutors, subscriptions, and safety.
        </p>
        <div className="faq-list">
          {FAQS.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <p className="muted" style={{ marginTop: "1.5rem" }}>
          <Link href="/support" className="btn btn-sm">
            Chat with AI support
          </Link>
        </p>
        <p className="muted" style={{ marginTop: "0.85rem" }}>
          Still stuck?{" "}
          <Link href="/contact">Contact</Link> ·{" "}
          <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> ·{" "}
          <Link href="/free-vs-paid">Free vs paid</Link> ·{" "}
          <Link href="/pricing">View pricing</Link> · <Link href="/how-it-works">How it works</Link>
        </p>
      </div>
    </div>
  );
}
