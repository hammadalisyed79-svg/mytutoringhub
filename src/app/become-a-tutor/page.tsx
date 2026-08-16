import Link from "next/link";

export const metadata = { title: "Become a tutor" };

export default function BecomeATutorPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Are you a tutor? Join MyTutoringHub</h1>
        <p className="section-lead">
          Advertise your lessons, get contacted by motivated students, and keep 100% of what you
          earn from classes.
        </p>

        <div className="steps" style={{ marginBottom: "2rem" }}>
          <div className="step">
            <span>1</span>
            <h3>Create your profile</h3>
            <p className="muted">Add subjects, rates, bio, and whether you teach online or in person.</p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Activate Tutor Basic</h3>
            <p className="muted">Appear in search and receive messages from subscribed students.</p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Grow with add-ons</h3>
            <p className="muted">Optional Verified badge and Highlighted listing for more visibility.</p>
          </div>
        </div>

        <div className="feature-split" style={{ marginBottom: "2rem" }}>
          <article className="panel">
            <h3>No lesson commission</h3>
            <p className="muted">
              Students pay you directly for lessons. MyTutoringHub only charges platform
              subscription fees.
            </p>
          </article>
          <article className="panel">
            <h3>Student request board</h3>
            <p className="muted">
              Reply to “need a tutor” ads and reach learners looking for your subject right now.
            </p>
          </article>
          <article className="panel">
            <h3>Set your own rates</h3>
            <p className="muted">You decide hourly pricing based on subject, level, and experience.</p>
          </article>
        </div>

        <div className="hero-ctas">
          <Link href="/register?role=tutor" className="btn">
            Sign up as a tutor
          </Link>
          <Link href="/pricing" className="btn btn-secondary">
            View tutor plans
          </Link>
          <Link href="/ads" className="btn btn-secondary">
            Browse student ads
          </Link>
        </div>
      </div>
    </div>
  );
}
