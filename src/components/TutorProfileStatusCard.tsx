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

  const statusLabel =
    view.status === "LIVE" ? "Live in search" : view.status === "SUSPENDED" ? "Suspended" : "Setup in progress";

  const required = view.checks.filter((c) => c.required);
  const needed = required.filter((c) => !c.ok);
  const done = required.filter((c) => c.ok);

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
        <div className="tutor-profile-status-copy">
          <div className="tutor-profile-status-meta">
            <p className="tutor-profile-status-eyebrow">{statusLabel}</p>
            {view.status !== "SUSPENDED" ? (
              <span className="tutor-profile-status-pct-inline" aria-label={`${view.percent}% complete`}>
                {view.percent}%
              </span>
            ) : null}
          </div>
          <h2 id="tutor-profile-status-title">{view.title}</h2>
          <p className="tutor-profile-status-summary">{view.summary}</p>
        </div>
      </div>

      {view.status === "INCOMPLETE" ? (
        <div className="tutor-profile-status-body">
          <div
            className="profile-strength-bar profile-strength-bar--compact"
            role="progressbar"
            aria-valuenow={view.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
          >
            <div className="profile-strength-fill" style={{ width: `${view.percent}%` }} />
          </div>

          {needed.length > 0 ? (
            <div className="tutor-profile-status-group">
              <p className="tutor-profile-status-group-label">Still needed</p>
              <ul className="tutor-profile-status-checks">
                {needed.map((c) => (
                  <li key={c.key} className="is-needed">
                    <span className="tutor-profile-check-mark" aria-hidden />
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {done.length > 0 ? (
            <div className="tutor-profile-status-group">
              <p className="tutor-profile-status-group-label">Done</p>
              <ul className="tutor-profile-status-checks is-done-row">
                {done.map((c) => (
                  <li key={c.key} className="is-done">
                    <span className="tutor-profile-check-mark" aria-hidden>
                      ✓
                    </span>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {view.status === "LIVE" ? (
        <ul className="tutor-profile-live-next">
          <li>Share your profile with students</li>
          <li>
            Reply to <Link href="/ads">student requests</Link>
          </li>
          <li>
            Check <Link href="/dashboard/tutor/analytics">views &amp; enquiries</Link>
          </li>
        </ul>
      ) : null}

      <div className="tutor-profile-status-actions">
        {view.cta ? (
          <Link className="btn btn-sm" href={view.cta.href}>
            {view.cta.label}
          </Link>
        ) : null}
        {view.secondaryCta ? (
          <Link className="btn btn-secondary btn-sm" href={view.secondaryCta.href}>
            {view.secondaryCta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
