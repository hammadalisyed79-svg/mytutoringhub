import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";

export const metadata = {
  title: "Help & FAQ",
  description:
    "Answers about contacting tutors, any-mailbox signup, Student Pass, Tutor Basic launch offer, payments, and email from admin@mytutoringhub.com.",
};

const FAQS = [
  {
    q: "How do I contact a tutor?",
    a: "Browse Find tutors, open a profile, and send a message. Free student accounts get 3 new tutor contacts per month. Student Pass unlocks unlimited messaging and request ads.",
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
    a: "Platform plans (Student Pass, Student Pro, Tutor Basic, Verified, Highlighted, Profile Boost) are billed through Safepay. You receive a receipt email after a successful payment. Lesson payments are arranged privately. Tutors can buy Profile Boost from the dashboard for 30 days of extra search visibility. Booking fees, group class listings, and resource uploads are not available yet.",
  },
  {
    q: "Is Tutor Basic free?",
    a: "Complete tutor profiles appear in search for free. Tutor Basic (complimentary until 30 September 2026) unlocks priority ranking, unlimited enquiry reveals, and subject ads. Verified badge, highlight, and Profile Boost remain paid add-ons. After that date the standard Tutor Basic price applies.",
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
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
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
          Still stuck?{" "}
          <Link href="/contact">Contact</Link> ·{" "}
          <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> ·{" "}
          <Link href="/pricing">View pricing</Link> · <Link href="/how-it-works">How it works</Link>
        </p>
      </div>
    </div>
  );
}
