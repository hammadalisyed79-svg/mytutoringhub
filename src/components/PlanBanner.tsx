import Link from "next/link";

export type PlanBannerProps = {
  role: "TUTOR" | "STUDENT";
  planName: string;
  /** Internal tier for styling: free | pro (Pass/Basic) | elite (Pro/Verified) */
  planTier: "free" | "pro" | "elite";
  usageUsed: number;
  usageLimit: number;
  usageLabel: string;
  renewsOn?: string | null;
};

export function PlanBanner({
  role: _role,
  planName,
  planTier,
  usageUsed,
  usageLimit,
  usageLabel,
  renewsOn,
}: PlanBannerProps) {
  const pct = usageLimit > 0 ? Math.min(100, (usageUsed / usageLimit) * 100) : 0;
  const barTone =
    pct >= 90 ? "is-warn" : planTier === "elite" ? "is-elite" : "is-default";

  return (
    <div className="plan-banner">
      <span className={`plan-banner-badge plan-banner-badge--${planTier}`}>{planName}</span>

      {usageLimit < 0 ? (
        <span className="plan-banner-usage plan-banner-usage--unlimited">
          Unlimited {usageLabel}
        </span>
      ) : usageLimit > 0 ? (
        <div className="plan-banner-meter">
          <span className="plan-banner-usage">
            {usageUsed} of {usageLimit} {usageLabel}
          </span>
          <div className="plan-banner-meter-track">
            <div
              className={`plan-banner-meter-fill ${barTone}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      {renewsOn && planTier !== "free" ? (
        <span className="plan-banner-renewal">Renews {renewsOn}</span>
      ) : null}

      <div className="plan-banner-actions">
        {planTier === "free" ? (
          <Link href="/pricing" className="btn btn-sm">
            Upgrade plan
          </Link>
        ) : (
          <Link href="/pricing" className="plan-banner-link">
            Manage plan →
          </Link>
        )}
      </div>
    </div>
  );
}
