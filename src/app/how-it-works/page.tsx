import Link from "next/link";

export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">How to find a private tutor</h1>
        <p className="section-lead">
          MyTutoringHub works like FindTutor: search tutors, contact them, then learn your way.
        </p>

        <div className="steps" style={{ marginBottom: "2.5rem" }}>
          <div className="step">
            <span>1</span>
            <h3>Search</h3>
            <p className="muted">
              Tell us what you want to learn — subject, online or in-person, and budget — then
              browse matching tutors.
            </p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Contact</h3>
            <p className="muted">
              With a Student Pass, message unlimited tutors, ask about trial lessons, and pick the
              best fit.
            </p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Learn</h3>
            <p className="muted">
              Start personalised classes. Agree on schedule and pay your tutor directly — we don’t
              take a cut of lesson fees.
            </p>
          </div>
        </div>

        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2>For students & parents</h2>
          <ul className="check-list">
            <li>Browse verified and highlighted tutors</li>
            <li>Post a free-style request ad so tutors can find you</li>
            <li>Leave reviews after you’ve messaged a tutor</li>
            <li>Cancel your Student Pass anytime from billing</li>
          </ul>
          <Link href="/register?role=student" className="btn" style={{ marginTop: "1rem" }}>
            I need a tutor
          </Link>
        </section>

        <section className="panel">
          <h2>For tutors</h2>
          <ul className="check-list">
            <li>Publish your profile with subjects and hourly rate</li>
            <li>Receive student messages with Tutor Basic</li>
            <li>Stand out with Verified and Highlighted add-ons</li>
            <li>Respond to student request ads</li>
          </ul>
          <Link href="/become-a-tutor" className="btn" style={{ marginTop: "1rem" }}>
            Become a tutor
          </Link>
        </section>
      </div>
    </div>
  );
}
