import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1>MyTutoringHub</h1>
          <p>
            Find trusted private tutors for school, languages, music, and more — then arrange
            lessons your way.
          </p>
          <div className="hero-ctas">
            <Link href="/register?role=student" className="btn">
              I need a tutor
            </Link>
            <Link href="/register?role=tutor" className="btn btn-secondary">
              I am a tutor
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>How it works</h2>
          <p className="section-lead">
            Like FindTutor: we connect people. Lesson payments stay between student and tutor.
          </p>
          <div className="steps">
            <div className="step">
              <span>1</span>
              <h3>Subscribe</h3>
              <p className="muted">Students and tutors unlock messaging with a simple monthly pass.</p>
            </div>
            <div className="step">
              <span>2</span>
              <h3>Connect</h3>
              <p className="muted">Search profiles, post a request ad, and start a conversation.</p>
            </div>
            <div className="step">
              <span>3</span>
              <h3>Learn</h3>
              <p className="muted">Agree on rates and schedule directly — keep 100% of lesson fees.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Ready when you are</h2>
          <p className="section-lead">Browse tutors now, or see subscription plans for students and tutors.</p>
          <div className="hero-ctas">
            <Link href="/search" className="btn">
              Browse tutors
            </Link>
            <Link href="/pricing" className="btn btn-secondary">
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
