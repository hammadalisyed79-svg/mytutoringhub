import Link from "next/link";

export const metadata = {
  title: "How it works",
  description:
    "Search private tutors, subscribe with a Student Pass to message and post ads, then arrange lessons directly. Tutors list with Tutor Basic.",
};

export default function HowItWorksPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">How to find a private tutor</h1>
        <p className="section-lead">
          Search tutors, subscribe with a Student Pass to message and post ads, then arrange lessons
          directly with your tutor.
        </p>

        <div className="steps" style={{ marginBottom: "2.5rem" }}>
          <div className="step">
            <span>1</span>
            <h3>Search</h3>
            <p className="muted">
              Filter by subject, city, level, language, free trial, and verified tutors — or open a
              subject SEO page like Maths in Lahore.
            </p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Contact with Student Pass</h3>
            <p className="muted">
              A Student Pass unlocks messaging and “need a tutor” ads. Without a Pass you can browse,
              but you cannot message or post requests.
            </p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Learn</h3>
            <p className="muted">
              Agree on schedule and pay your tutor directly for lessons — we don’t take a lesson
              commission.
            </p>
          </div>
        </div>

        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2>For students & parents</h2>
          <ul className="check-list">
            <li>Browse verified, highlighted, and boosted tutors</li>
            <li>Report abuse from profiles or student ads</li>
            <li>Leave reviews after messaging (moderated before publish)</li>
            <li>Download past papers (2016–2025) by subject — one-time fee set by admin</li>
            <li>Manage account details anytime in Settings</li>
          </ul>
          <Link href="/register?role=student" className="btn" style={{ marginTop: "1rem" }}>
            I need a tutor
          </Link>
        </section>

        <section className="panel">
          <h2>For tutors</h2>
          <ul className="check-list">
            <li>Tutor Basic lists your profile and up to 3 subject ads (complimentary until 30 September 2026)</li>
            <li>
              Upload a government photo ID (passport, national ID / CNIC, or driving licence) for
              verification; a qualification certificate is recommended
            </li>
            <li>Boost or Highlight listings for timed search placement</li>
            <li>Request reviews from students you’ve messaged</li>
          </ul>
          <Link href="/become-a-tutor" className="btn" style={{ marginTop: "1rem" }}>
            Become a tutor
          </Link>
        </section>
      </div>
    </div>
  );
}
