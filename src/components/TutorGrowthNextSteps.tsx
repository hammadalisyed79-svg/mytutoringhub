import Link from "next/link";
import {
  type DashboardSearchParams,
  tutorDashboardTabHref,
} from "@/lib/dashboard-home";

type Step = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
};

/**
 * One clear path for tutors on the Growth tab: Live listing → Messages → Requests.
 */
export function TutorGrowthNextSteps({
  liveInSearch,
  unread = 0,
  sp,
}: {
  liveInSearch: boolean;
  unread?: number;
  sp: DashboardSearchParams;
}) {
  const listingsHref = tutorDashboardTabHref(sp, "profile", "teaching-listings");
  const steps: Step[] = [
    {
      id: "live",
      label: liveInSearch
        ? "Your listing is live in search"
        : "Publish a live listing (Teaching Profile)",
      done: liveInSearch,
      href: listingsHref,
      cta: liveInSearch ? "Manage listings" : "Go live",
    },
    {
      id: "messages",
      label:
        unread > 0
          ? `Reply to messages (${unread} unread)`
          : "Check messages from students",
      done: false,
      href: "/messages",
      cta: unread > 0 ? "Open inbox" : "Messages",
    },
    {
      id: "requests",
      label: "Browse Requests that match what you teach",
      done: false,
      href: "/ads",
      cta: "View Requests",
    },
  ];

  const primary = steps.find((s) => !s.done) || steps[0];

  return (
    <section className="panel tutor-growth-next" aria-labelledby="tutor-growth-next-title">
      <div className="tutor-growth-next-head">
        <div>
          <p className="eyebrow">Next steps</p>
          <h2 id="tutor-growth-next-title">Grow your tutoring</h2>
          <p className="muted section-lead-tight">
            Stay live in search, reply to students, then pick matching requests.
          </p>
        </div>
        <Link className="btn" href={primary.href}>
          {primary.cta}
        </Link>
      </div>
      <ol className="tutor-growth-next-steps">
        {steps.map((step, i) => (
          <li key={step.id} className={step.done ? "is-done" : i === steps.findIndex((s) => !s.done) ? "is-current" : ""}>
            <span className="tutor-growth-next-mark" aria-hidden>
              {step.done ? "✓" : i + 1}
            </span>
            <span className="tutor-growth-next-copy">
              <strong>{step.label}</strong>
              {!step.done ? (
                <Link href={step.href} className="tutor-growth-next-link">
                  {step.cta}
                </Link>
              ) : (
                <Link href={step.href} className="tutor-growth-next-link muted">
                  {step.cta}
                </Link>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
