"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <section className="panel">
          <h1 className="page-title">Something went wrong</h1>
          <p className="muted">
            Please try again. If this continues, email{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>.
          </p>
          <div className="hero-ctas" style={{ marginTop: "1.25rem" }}>
            <button className="btn" type="button" onClick={() => reset()}>
              Try again
            </button>
            <Link href="/" className="btn btn-secondary">
              Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
