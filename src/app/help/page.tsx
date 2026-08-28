import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { faqPageJsonLd, pageMetadata } from "@/lib/seo";
import { STUDENT_FREE_CONTACTS_LINE, TUTOR_FREE_LISTING_LINE, studentFreeContactsShort } from "@/lib/marketing-copy";

export const metadata = pageMetadata({
  title: "Help & FAQ – Contacting Tutors, Plans & Payments",
  description:
    "Answers about finding tutors, Student Pass, Tutor Basic, Safepay billing, email verification, and safety on My Tutoring Hub.",
  path: "/help",
});

const FAQS = [
  {
    q: "What are Hub Points?",
    a: "Hub Points are platform credit — each point converts to your local currency on Pricing. Tutors earn 200 points when their profile goes live in search. Everyone earns 50 points per successful referral when the invitee completes the milestone. Redeem up to 50% off subscriptions and tutor ads on Pricing.",
  },
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
    a: "Platform plans (Student Pass, Student Pro, Tutor Basic, Verified, Highlighted, Profile Boost) are billed through Safepay when live. Until card checkout is activated, complimentary Tutor Basic and free listings work without payment — email admin@mytutoringhub.com for manual plan activation. You receive a receipt email after a successful payment. Lesson payments are arranged privately.",
  },
  {
    q: "Is Tutor Basic free?",
    a: "Complete tutor profiles appear in search for free. Until 30 September 2026, unlimited subject profiles are free for every tutor, and Tutor Basic (priority ranking + unlimited enquiry reveals when you message students first) is complimentary. Verified badge, Highlight, and Profile Boost remain paid add-ons — Boost/Highlight are bought per subject profile. From 1 October 2026, free tutors keep 1 subject profile and 3 enquiry reveals/month; free students keep 3 new tutor contacts/month.",
  },
  {
    q: "Why do I need to verify my email?",
    a: "After signup we send a confirmation link from admin@mytutoringhub.com. You can use your dashboard immediately, but messaging and student requests stay locked until you confirm. The AI study assistant also needs Student Pro. Resend the link from Pricing, Dashboard, or Settings.",
  },
  {
    q: "What is a Verified tutor?",
    a: "Verified tutors upload a government photo ID (passport, national ID / CNIC, or driving licence). A qualification certificate is recommended. Admins review the files privately and then approve the badge. Purchasing Verified Tutor only prioritises the queue.",
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
