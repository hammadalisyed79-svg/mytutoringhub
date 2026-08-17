"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
          background: "#f6f4ef",
          color: "#14241f",
        }}
      >
        <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.25rem" }}>
          <p style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "#0d5f52" }}>
            My Tutoring Hub
          </p>
          <h1 style={{ fontSize: "1.75rem" }}>Something went wrong</h1>
          <p style={{ color: "#5c6e67" }}>
            Please try again. If this continues, email{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#0d5f52",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "0.7rem 1.1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "#5c6e67" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
