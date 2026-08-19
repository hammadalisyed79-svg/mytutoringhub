import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserPlan, getMonthlyUsage } from "@/lib/plan-limits";

export const metadata = { title: "My Plan — Tutor Dashboard" };
export const dynamic = "force-dynamic";

const TUTOR_PLANS = [
  {
    id: "free",
    name: "Free Starter",
    price: "Free",
    features: [
      "Profile listing",
      "5 enquiry reveals / month",
      "Appear in search results",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro Tutor",
    price: "From $12.99/mo",
    features: [
      "Unlimited enquiry reveals",
      "Priority placement in search",
      "Verified badge",
      "Analytics dashboard",
    ],
    highlight: true,
  },
  {
    id: "elite",
    name: "Elite Tutor",
    price: "From $24.99/mo",
    features: [
      "Everything in Pro",
      "Featured placement",
      "Homepage spotlight",
      "Early access to new features",
    ],
    highlight: false,
  },
];

export default async function TutorPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TUTOR") redirect("/dashboard");

  const [planSlug, revealsUsed] = await Promise.all([
    getUserPlan(session.user.id).catch(() => "free"),
    getMonthlyUsage(session.user.id, "enquiry_reveal").catch(() => 0),
  ]);

  const isPaid =
    planSlug.includes("tutor_pro") ||
    planSlug.includes("tutor_elite") ||
    planSlug.includes("verified_tutor") ||
    planSlug.includes("pro") ||
    planSlug.includes("elite");

  const tier: "free" | "pro" | "elite" = planSlug.includes("elite")
    ? "elite"
    : planSlug !== "free" && isPaid
    ? "pro"
    : "free";

  const plan = {
    tier,
    name: tier === "elite" ? "Elite Tutor" : tier === "pro" ? "Pro Tutor" : "Free Starter",
    price: null as null | string,
    billingPeriod: null as null | string,
    renewsOn: null as null | string,
    enquiryRevealsUsed: revealsUsed,
    enquiryRevealsLimit: isPaid ? -1 : 5,
  };

  const pct =
    plan.enquiryRevealsLimit > 0
      ? Math.min(100, (plan.enquiryRevealsUsed / plan.enquiryRevealsLimit) * 100)
      : plan.enquiryRevealsLimit === -1
      ? 0
      : 0;

  const badgeColor =
    plan.tier === "elite" ? "var(--accent)" : plan.tier === "pro" ? "var(--ok)" : "var(--muted)";

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 820 }}>
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "1rem" }}>
          <Link href="/dashboard" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            ← Dashboard
          </Link>
          <Link href="/dashboard/tutor/analytics" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            Analytics →
          </Link>
        </div>
        <h1 className="page-title">My Plan</h1>

        {/* Current plan card */}
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
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
                {plan.name}
              </span>
              {plan.price && (
                <p style={{ marginTop: "0.4rem", fontWeight: 600, fontSize: "1.1rem" }}>
                  {plan.price}{" "}
                  {plan.billingPeriod && (
                    <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.9rem" }}>
                      · billed {plan.billingPeriod}
                    </span>
                  )}
                </p>
              )}
              {plan.tier === "free" && (
                <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                  Free plan — limited features
                </p>
              )}
              {plan.renewsOn && (
                <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Renews on {plan.renewsOn}
                </p>
              )}
            </div>
            <Link
              href="/pricing"
              style={{
                background: "var(--brand)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "0.4em 1.1em",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              View all plans
            </Link>
          </div>

          {/* Feature list */}
          <ul style={{ margin: "1rem 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {TUTOR_PLANS.find((p) => p.id === plan.tier)?.features.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--ok)" }}>✓</span> {f}
              </li>
            ))}
          </ul>
        </section>

        {/* Usage meters */}
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Usage this month</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
              <span>Enquiry reveals</span>
              <span style={{ color: "var(--muted)" }}>
                {plan.enquiryRevealsUsed} / {plan.enquiryRevealsLimit === -1 ? "∞" : plan.enquiryRevealsLimit}
              </span>
            </div>
            <div
              style={{
                height: "8px",
                borderRadius: "999px",
                background: "var(--paper-deep)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: pct >= 90 ? "var(--accent)" : "var(--brand)",
                  borderRadius: "999px",
                }}
              />
            </div>
            {pct >= 80 && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--accent)" }}>
                Running low.{" "}
                <Link href="/pricing" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Upgrade to Pro
                </Link>{" "}
                for unlimited reveals.
              </p>
            )}
          </div>
        </section>

        {/* Upgrade cards */}
        {plan.tier === "free" && (
          <section style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Upgrade your plan
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "1rem",
              }}
            >
              {TUTOR_PLANS.filter((p) => p.id !== "free").map((up) => (
                <div
                  key={up.id}
                  className="panel"
                  style={{
                    border: up.highlight ? "2px solid var(--brand)" : undefined,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {up.highlight && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-1px",
                        right: "1rem",
                        background: "var(--brand)",
                        color: "#fff",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        padding: "0.15em 0.65em",
                        borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                        textTransform: "uppercase",
                      }}
                    >
                      Popular
                    </span>
                  )}
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{up.name}</h3>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>{up.price}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {up.features.map((f) => (
                      <li key={f} style={{ fontSize: "0.85rem", display: "flex", gap: "0.4rem" }}>
                        <span style={{ color: "var(--ok)" }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/pricing"
                    style={{
                      marginTop: "auto",
                      background: up.highlight ? "var(--brand)" : "transparent",
                      color: up.highlight ? "#fff" : "var(--brand)",
                      border: up.highlight ? "none" : "1px solid var(--brand)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.4em 1em",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      textAlign: "center",
                      display: "block",
                    }}
                  >
                    Upgrade to {up.name}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Service fee history */}
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Service fee history</h2>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Profile boosts, highlighted listings, and other one-off purchases will appear here.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.75rem" }}>Date</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Item</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} style={{ padding: "1rem 0.75rem", color: "var(--muted)", textAlign: "center" }}>
                  No transactions yet
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
