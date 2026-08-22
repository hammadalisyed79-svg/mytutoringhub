import Link from "next/link";

export type PlanBannerProps = {
  role: "TUTOR" | "STUDENT";
  planName: string;
  /** "free" | "pro" | "elite" */
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
  const badgeColor =
    planTier === "elite"
      ? "var(--accent)"
      : planTier === "pro"
        ? "var(--ok)"
        : "var(--muted)";

  const pct = usageLimit > 0 ? Math.min(100, (usageUsed / usageLimit) * 100) : 0;
  const barColor = pct >= 90 ? "var(--accent)" : "var(--brand)";

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "0.85rem 1.1rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem 1.5rem",
        alignItems: "center",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span
        style={{
          background: badgeColor,
          color: "#fff",
          borderRadius: "999px",
          padding: "0.18em 0.75em",
          fontSize: "0.78rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {planName}
      </span>

      {usageLimit < 0 ? (
        <span style={{ fontSize: "0.82rem", color: "var(--muted)", flex: "1 1 180px" }}>
          Unlimited {usageLabel}
        </span>
      ) : usageLimit > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: "1 1 180px", minWidth: 0 }}>
          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            {usageUsed} of {usageLimit} {usageLabel}
          </span>
          <div
            style={{
              height: "6px",
              borderRadius: "999px",
              background: "var(--paper-deep)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: barColor,
                borderRadius: "999px",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      ) : null}

      {renewsOn && planTier !== "free" && (
        <span style={{ fontSize: "0.82rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
          Renews {renewsOn}
        </span>
      )}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginLeft: "auto" }}>
        {planTier === "free" && (
          <Link
            href="/pricing"
            style={{
              background: "var(--brand)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              padding: "0.3em 0.9em",
              fontSize: "0.82rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Upgrade plan
          </Link>
        )}
        {planTier !== "free" && (
          <Link
            href="/pricing"
            style={{
              color: "var(--brand)",
              fontWeight: 600,
              fontSize: "0.82rem",
              whiteSpace: "nowrap",
            }}
          >
            Manage plan →
          </Link>
        )}
      </div>
    </div>
  );
}
