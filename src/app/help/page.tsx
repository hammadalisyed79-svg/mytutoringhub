import Link from "next/link";

export const metadata = { title: "Help & FAQ" };

const FAQS = [
  {
    q: "How do I contact a tutor?",
    a: "Browse Find tutors, open a profile, and send a message. Students need an active Student Pass to message and to post requests.",
  },
  {
    q: "Do you take a commission on lessons?",
    a: "No. Lesson fees stay between you and the tutor. MyTutoringHub only charges optional platform subscriptions and visibility upgrades.",
  },
  {
    q: "How do payments work?",
    a: "Platform plans (Student Pass, Tutor Basic, Verified, Highlighted, Ad Boost) are paid via Safepay checkout. Lesson payments are arranged privately.",
  },
  {
    q: "What is a Verified tutor?",
    a: "Verified tutors have submitted documents for review (and/or purchased Verified). Admins approve the badge after checking details.",
  },
  {
    q: "How do reviews work?",
    a: "Students who have messaged a tutor can leave a review. Reviews may be moderated before they appear publicly.",
  },
  {
    q: "How do I report a problem?",
    a: "Use the Report button on a tutor profile or student ad, or email admin@mytutoringhub.com.",
  },
];

export default function HelpPage() {
  return (
    <div className="page">
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
          <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> ·{" "}
          <Link href="/pricing">View pricing</Link> · <Link href="/how-it-works">How it works</Link>
        </p>
      </div>
    </div>
  );
}
