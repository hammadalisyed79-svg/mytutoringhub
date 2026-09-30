import Link from "next/link";
import type { TutorProfileStatusView } from "@/lib/tutor-profile-status";

export function PostVerifyTutorChecklist({ view }: { view: TutorProfileStatusView }) {
  if (view.status === "SUSPENDED") {
    return (
      <section className="panel post-verify-checklist" aria-labelledby="post-verify-tutor-title">
        <h2 id="post-verify-tutor-title">Account suspended</h2>
        <p className="muted">
          Your Teaching Profiles are hidden from search while this account is suspended. Contact
          support if you need a review.
        </p>
        <div className="post-verify-checklist-actions">
          <a className="btn" href="mailto:admin@mytutoringhub.com">
            Email support
          </a>
          <Link className="btn btn-secondary" href="/help">
            Help &amp; FAQ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel post-verify-checklist" aria-labelledby="post-verify-tutor-title">
      <p className="success" role="status">
        Email confirmed — nice work.
      </p>
      <h2 id="post-verify-tutor-title">
        {view.status === "LIVE" ? "Students can find and message you" : "Finish setup to go live"}
      </h2>
      <p className="muted">
        {view.status === "LIVE"
          ? "Reply to open requests and keep your Teaching Profiles up to date."
          : "Photo, about you, location, qualifications — then publish one Teaching Profile. Students can’t message you until you’re live."}
      </p>
      <div className="post-verify-checklist-actions">
        <Link className="btn" href="/dashboard/tutor?tab=profile#tutor-profile">
          {view.status === "LIVE" ? "View profile" : "Continue setup"}
        </Link>
        {view.status === "LIVE" ? (
          <Link className="btn btn-secondary" href="/ads">
            Requests
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function PostVerifyStudentChecklist() {
  const steps = [
    { label: "Search tutors by subject and city", href: "/search", done: true },
    { label: "Message tutors (free monthly contacts apply)", href: "/messages", done: false },
    { label: "Post a request if you want tutors to come to you", href: "/ads/new", done: false },
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
