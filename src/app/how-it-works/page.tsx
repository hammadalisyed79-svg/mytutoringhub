import Link from "next/link";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "How it works",
  description:
    "Search private tutors, message with free monthly contacts or a Student Pass, then arrange lessons directly. Tutors list with Tutor Basic.",
};

export const dynamic = "force-dynamic";

export default async function HowItWorksPage() {
  const session = await auth();
  const role = session?.user?.role;
  const studentCta =
    role === "STUDENT" || role === "TUTOR" || role === "ADMIN"
      ? { href: "/search", label: "Find a tutor" }
      : { href: "/register?role=student", label: "I need a tutor" };
  const tutorCta =
    role === "TUTOR"
      ? { href: "/dashboard", label: "Open tutor dashboard" }
      : { href: "/become-a-tutor", label: "Become a tutor" };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">How to find a private tutor</h1>
        <p className="section-lead">
          Search tutors, message with free monthly contacts or a Student Pass, then arrange lessons
          directly.
        </p>

        <div className="steps" style={{ marginBottom: "2.5rem" }}>
          <div className="step">
            <span>1</span>
            <h3>Search</h3>
            <p className="muted">
              Filter by subject, country, city, level, language, and verified tutors.
            </p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Contact tutors</h3>
            <p className="muted">
              Free accounts get 3 new tutor contacts per month. A Student Pass unlocks unlimited
              messaging and “need a tutor” ads. Student Pro adds the AI study assistant.
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

        {role !== "TUTOR" && (
          <section className="panel" style={{ marginBottom: "1.5rem" }}>
            <h2>For students & parents</h2>
            <ul className="check-list">
              <li>Browse verified, highlighted, and boosted tutors</li>
              <li>Message tutors free (3 contacts/month) or unlimited with Student Pass</li>
              <li>Student Pro unlocks the AI study assistant</li>
              <li>Download past papers by subject</li>
              <li>Manage your name and password in Settings</li>
            </ul>
            <Link href={studentCta.href} className="btn" style={{ marginTop: "1rem" }}>
              {studentCta.label}
            </Link>
          </section>
        )}

        {role !== "STUDENT" && (
          <section className="panel">
            <h2>For tutors</h2>
            <ul className="check-list">
              <li>
                Tutor Basic lists your profile (complimentary until 30 September 2026)
              </li>
              <li>
                Upload a government photo ID for verification; a qualification certificate is
                recommended
              </li>
              <li>Boost or highlight from the same Pricing page — paid on Safepay</li>
            </ul>
            <Link href={tutorCta.href} className="btn" style={{ marginTop: "1rem" }}>
              {tutorCta.label}
            </Link>
          </section>
        )}

        {role === "STUDENT" && (
          <p className="muted" style={{ marginTop: "1.5rem" }}>
            Want to teach as well? <Link href="/become-a-tutor">Become a tutor</Link> on this
            account.
          </p>
        )}
      </div>
    </div>
  );
}
