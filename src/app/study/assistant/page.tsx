import Link from "next/link";

export const metadata = { title: "AI Study Assistant — MyTutoringHub" };

export default function StudyAssistantPage() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link href="/dashboard" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            ← Dashboard
          </Link>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
          }}
        >
          {/* CSS art / emoji illustration */}
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
              lineHeight: 1,
            }}
            aria-hidden
          >
            🤖
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--paper-deep)",
              borderRadius: "999px",
              padding: "0.3em 1em",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--brand)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "1.25rem",
            }}
          >
            Study Pro Feature
          </div>

          <h1
            style={{
              fontSize: "clamp(1.6rem, 5vw, 2.4rem)",
              fontWeight: 800,
              margin: "0 0 1rem",
              lineHeight: 1.15,
            }}
          >
            AI Study Assistant
          </h1>

          <p
            style={{
              color: "var(--muted)",
              fontSize: "1.05rem",
              lineHeight: 1.65,
              margin: "0 auto 2rem",
              maxWidth: 480,
            }}
          >
            Coming soon for{" "}
            <strong style={{ color: "var(--ink)" }}>Study Pro</strong> subscribers.
            Our AI assistant will help you with exam questions, essay feedback,
            and personalised revision plans.
          </p>

          {/* Feature previews */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "0.75rem",
              marginBottom: "2rem",
              textAlign: "left",
            }}
          >
            {[
              { icon: "💬", title: "Exam Q&A", desc: "Get instant help on any past paper question." },
              { icon: "✍️", title: "Essay Feedback", desc: "Submit drafts and receive structured feedback." },
              { icon: "📅", title: "Revision Plans", desc: "Personalised timetables tailored to your exams." },
            ].map((f) => (
              <div
                key={f.title}
                className="panel"
                style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
              >
                <span style={{ fontSize: "1.4rem" }}>{f.icon}</span>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{f.title}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{f.desc}</span>
              </div>
            ))}
          </div>

          <Link
            href="/pricing"
            style={{
              display: "inline-block",
              background: "var(--brand)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              padding: "0.6em 1.8em",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            Upgrade to Study Pro
          </Link>

          <p style={{ marginTop: "1.25rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Already a Study Pro member?{" "}
            <Link href="/dashboard" style={{ color: "var(--brand)" }}>
              Go to your dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
