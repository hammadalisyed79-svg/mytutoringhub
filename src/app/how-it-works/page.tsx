import Link from "next/link";

export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">How MyTutoringHub works</h1>
        <p className="section-lead">
          A FindTutor-style marketplace: subscribe for access, connect freely, pay for lessons
          privately.
        </p>

        <div className="steps" style={{ marginBottom: "2rem" }}>
          <div className="step">
            <span>1</span>
            <h3>Register</h3>
            <p className="muted">Join as a student/parent or as a tutor.</p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Subscribe</h3>
            <p className="muted">
              Student Pass unlocks messaging and ads. Tutor Basic lists your profile. Optional
              Verified and Highlighted add-ons boost trust and visibility.
            </p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Connect & learn</h3>
            <p className="muted">
              Message, agree on rates and schedule, then pay each other directly. We never take a
              lesson commission.
            </p>
          </div>
        </div>

        <Link href="/pricing" className="btn">
          See pricing
        </Link>
      </div>
    </div>
  );
}
