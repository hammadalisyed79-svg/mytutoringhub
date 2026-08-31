import Link from "next/link";
import type { TutorProfileStatusView } from "@/lib/tutor-profile-status";

export function PostVerifyTutorChecklist({ view }: { view: TutorProfileStatusView }) {
  const profileSteps = view.checks.filter((c) => c.required && c.key !== "email");

  return (
    <section className="panel post-verify-checklist" aria-labelledby="post-verify-tutor-title">
      <p className="success" role="status">
        Email confirmed — nice work.
      </p>
      <h2 id="post-verify-tutor-title">Next: get your tutor profile live</h2>
      <p className="muted">
        Complete profiles appear in search for free. Tutor Pro adds ranking and unlimited enquiry
        reveals — not basic visibility.
      </p>
      <ol className="post-verify-checklist-steps">
        <li className="is-done">
          <span aria-hidden>✓</span> Email verified
        </li>
        {profileSteps.map((step) => (
          <li key={step.key} className={step.ok ? "is-done" : "is-needed"}>
            <span aria-hidden>{step.ok ? "✓" : "○"}</span> {step.label}
          </li>
        ))}
      </ol>
      <div className="post-verify-checklist-actions">
        <Link className="btn" href="/dashboard/tutor?tab=profile#tutor-profile">
          {view.status === "LIVE" ? "View profile editor" : "Complete my profile"}
        </Link>
        {view.status === "LIVE" && view.cta ? (
          <Link className="btn btn-secondary" href={view.cta.href}>
            View public listing
          </Link>
        ) : (
          <Link className="btn btn-secondary" href="/ads">
            Browse student requests
          </Link>
        )}
      </div>
    </section>
  );
}

export function PostVerifyStudentChecklist() {
  const steps = [
    { label: "Search tutors by subject and city", href: "/search", done: true },
    { label: "Message tutors (free monthly contacts apply)", href: "/messages", done: false },
    { label: "Post a student request if you want tutors to come to you", href: "/ads/new", done: false },
    { label: "Browse past papers and study tools", href: "/past-papers", done: false },
  ];

  return (
    <section className="panel post-verify-checklist" aria-labelledby="post-verify-student-title">
      <p className="success" role="status">
        Email confirmed — you are ready to explore.
      </p>
      <h2 id="post-verify-student-title">Suggested next steps</h2>
      <ol className="post-verify-checklist-steps">
        <li className="is-done">
          <span aria-hidden>✓</span> Email verified
        </li>
        {steps.map((step) => (
          <li key={step.href} className={step.done ? "is-done" : "is-needed"}>
            <span aria-hidden>{step.done ? "✓" : "○"}</span>{" "}
            <Link href={step.href}>{step.label}</Link>
          </li>
        ))}
      </ol>
      <div className="post-verify-checklist-actions">
        <Link className="btn" href="/search">
          Find tutors
        </Link>
        <Link className="btn btn-secondary" href="/pricing">
          Compare plans
        </Link>
      </div>
    </section>
  );
}
