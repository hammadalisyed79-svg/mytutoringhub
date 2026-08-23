import Link from "next/link";
import type { TutorProfileStatusView } from "@/lib/tutor-profile-status";

export function TutorProfileStatusCard({
  view,
  justWentLive = false,
}: {
  view: TutorProfileStatusView;
  justWentLive?: boolean;
}) {
  const statusClass =
    view.status === "LIVE"
      ? "is-live"
      : view.status === "SUSPENDED"
        ? "is-suspended"
        : "is-incomplete";

  return (
    <section
      className={`panel tutor-profile-status-card ${statusClass}`}
      aria-labelledby="tutor-profile-status-title"
    >
      {justWentLive && view.status === "LIVE" ? (
        <p className="success tutor-profile-live-banner" role="status">
          Your tutor profile is now live.
        </p>
      ) : null}

      <div className="tutor-profile-status-card-head">
        <div>
          <p className="tutor-profile-status-eyebrow">
            {view.status === "LIVE"
              ? "LIVE"
              : view.status === "SUSPENDED"
                ? "SUSPENDED"
                : "INCOMPLETE"}
          </p>
          <h2 id="tutor-profile-status-title">{view.title}</h2>
          <p className="muted">{view.summary}</p>
        </div>
        {view.status !== "SUSPENDED" ? (
          <div className="tutor-profile-status-pct" aria-label={`${view.percent}% complete`}>
            <strong>{view.percent}%</strong>
            <span>complete</span>
          </div>
        ) : null}
      </div>

      {view.status === "INCOMPLETE" ? (
        <>
          <div className="profile-strength-bar" aria-hidden>
            <div className="profile-strength-fill" style={{ width: `${view.percent}%` }} />
          </div>
          <ul className="tutor-profile-status-checks">
            {view.checks
              .filter((c) => c.required)
              .map((c) => (
                <li key={c.key} className={c.ok ? "is-done" : "is-needed"}>
                  <span aria-hidden>{c.ok ? "✓" : "○"}</span> {c.label}
                </li>
              ))}
          </ul>
        </>
      ) : null}

      {view.status === "LIVE" ? (
        <ul className="tutor-profile-live-next muted">
          <li>Share your profile with students</li>
          <li>
            Reply to{" "}
            <Link href="/ads">student requests</Link>
          </li>
          <li>
            Check{" "}
            <Link href="/dashboard/tutor/analytics">views &amp; enquiries</Link>
          </li>
        </ul>
      ) : null}

      <div className="tutor-profile-status-actions">
        {view.cta ? (
          <Link className="btn" href={view.cta.href}>
            {view.cta.label}
          </Link>
        ) : null}
        {view.secondaryCta ? (
          <Link className="btn btn-secondary" href={view.secondaryCta.href}>
            {view.secondaryCta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
