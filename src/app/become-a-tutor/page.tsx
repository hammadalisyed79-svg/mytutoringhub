import Link from "next/link";

export const metadata = { title: "Become a tutor" };

export default function BecomeATutorPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Are you a tutor? Join MyTutoringHub</h1>
        <p className="section-lead">
          Publish a rich profile, run multiple subject ads, get verified, and keep 100% of lesson
          fees. Students need a Pass to message you — you need Tutor Basic to appear in search.
        </p>

        <div className="steps" style={{ marginBottom: "2rem" }}>
          <div className="step">
            <span>1</span>
            <h3>Create your profile</h3>
            <p className="muted">
              Add subjects, rates, qualifications, languages, availability, photo, and optional free
              trial.
            </p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Activate Tutor Basic</h3>
            <p className="muted">
              Appear in search with up to 3 active subject ads. Add Unlimited Ads if you teach more
              niches.
            </p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Verify & boost</h3>
            <p className="muted">
              Upload ID/credentials for a Verified badge. Optional Highlighted and Ad Boost plans
              improve placement for 30 days.
            </p>
          </div>
        </div>

        <div className="feature-split" style={{ marginBottom: "2rem" }}>
          <article className="panel">
            <h3>No lesson commission</h3>
            <p className="muted">
              Students pay you directly. MyTutoringHub only charges platform subscriptions and
              visibility add-ons.
            </p>
          </article>
          <article className="panel">
            <h3>Multi-subject ads</h3>
            <p className="muted">
              List each subject separately so students searching Maths, Physics, or IELTS land on the
              right offer.
            </p>
          </article>
          <article className="panel">
            <h3>Student request board</h3>
            <p className="muted">
              Reply to “need a tutor” ads from students with an active Pass looking for your subject.
            </p>
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
