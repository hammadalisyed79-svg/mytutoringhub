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
    a: "Browse Find tutors, open a profile, and send a message. Students need an active Student Pass to message and to post requests.",
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
    q: "How do payments work?",
    a: "Platform plans (Student Pass, Tutor Basic, Verified, Highlighted, Ad Boost) are billed through Safepay. You receive a receipt email after a successful payment. Lesson payments are arranged privately.",
  },
  {
    q: "Is Tutor Basic free?",
    a: "There is a launch offer: Tutor Basic listing is complimentary until 30 September 2026. Verified badge, highlight, and ad boost remain paid add-ons. After that date the standard Tutor Basic price applies.",
  },
  {
    q: "Why do I need to verify my email?",
    a: "After signup we send a confirmation link from admin@mytutoringhub.com. You can use your dashboard immediately, but messaging, ads, and the study assistant unlock after you confirm. Resend the link from Pricing, Dashboard, or Settings.",
  },
  {
    q: "What is a Verified tutor?",
    a: "Verified tutors upload a government photo ID (passport, national ID / CNIC, or driving licence). A qualification certificate is recommended. Admins review the files privately and then approve the badge. Purchasing Verified Tutor only prioritises the queue.",
  },
  {
    q: "How do reviews work?",
    a: "Students who have messaged a tutor can leave a review. Reviews may be moderated before they appear publicly.",
  },
  {
    q: "How do I report a problem?",
    a: "Use the Report button on a tutor profile or student ad, or email admin@mytutoringhub.com.",
  },
  {
    q: "What is the Study assistant?",
    a: "Logged-in students and tutors can use an AI study coach for explanations and practice. It is not a live tutor and has a daily message limit. For human help, search Find tutors.",
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
