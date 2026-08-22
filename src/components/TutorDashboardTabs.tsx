import Link from "next/link";
import {
  type DashboardSearchParams,
  tutorDashboardTabHref,
  type TutorDashboardTab,
} from "@/lib/dashboard-home";

export function TutorDashboardTabs({
  active,
  sp,
  profilePct,
}: {
  active: TutorDashboardTab;
  sp: DashboardSearchParams;
  profilePct?: number;
}) {
  const profileIncomplete = typeof profilePct === "number" && profilePct < 100;

  return (
    <nav className="page-tabs tutor-dashboard-tabs" aria-label="Tutor dashboard sections">
      <Link
        href={tutorDashboardTabHref(sp, "growth")}
        className={`page-tab${active === "growth" ? " is-active" : ""}`}
        aria-current={active === "growth" ? "page" : undefined}
      >
        Growth journey
      </Link>
      <Link
        href={tutorDashboardTabHref(sp, "profile")}
        className={`page-tab${active === "profile" ? " is-active" : ""}`}
        aria-current={active === "profile" ? "page" : undefined}
      >
        Profile &amp; listing
        {profileIncomplete ? (
          <span className="tutor-dashboard-tab-badge" aria-label="Profile incomplete">
            {profilePct}%
          </span>
        ) : null}
      </Link>
    </nav>
  );
}
