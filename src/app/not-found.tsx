import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <section className="panel">
          <p className="eyebrow">404</p>
          <h1 className="page-title">Page not found</h1>
          <p className="muted">
            That link may be outdated, or the tutor listing is not public yet. You can search for
            tutors or return home.
          </p>
          <div className="hero-ctas" style={{ marginTop: "1.25rem" }}>
            <Link href="/" className="btn">
              Home
            </Link>
            <Link href="/search" className="btn btn-secondary">
              Find tutors
            </Link>
            <Link href="/help" className="btn btn-secondary">
              Help
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
