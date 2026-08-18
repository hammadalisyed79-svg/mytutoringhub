"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PastPapersError({
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
      <div className="container">
        <section className="panel">
          <h1 className="page-title">Past papers</h1>
          <p className="form-error">Could not load past papers. Please try again.</p>
          <div className="hero-ctas" style={{ marginTop: "1.25rem" }}>
            <button className="btn" type="button" onClick={() => reset()}>
              Try again
            </button>
            <Link href="/past-papers" className="btn btn-secondary">
              Past papers home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
