import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export const metadata = { title: "Subscription — Settings" };
export const dynamic = "force-dynamic";

// TODO: replace with real subscription lookup
const MOCK_SUB = {
  planName: "Free",
  tier: "free" as "free" | "paid",
  price: null as null | string,
  billingPeriod: null as null | string,
  renewsOn: null as null | string,
  startedOn: null as null | string,
};

export default async function SettingsPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sub = MOCK_SUB;

  const badgeColor = sub.tier === "paid" ? "var(--ok)" : "var(--muted)";

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link href="/settings" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            ← Account settings
          </Link>
        </div>
        <h1 className="page-title">Subscription</h1>

        {/* Current subscription */}
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Current plan</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
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
              {sub.planName}
            </span>
            {sub.price && (
              <span style={{ fontWeight: 600 }}>
                {sub.price}
                {sub.billingPeriod && (
                  <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.9rem" }}>
                    {" "}
                    · billed {sub.billingPeriod}
                  </span>
                )}
              </span>
            )}
          </div>

          {sub.renewsOn && (
            <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
              Renews on {sub.renewsOn}
            </p>
          )}
          {sub.startedOn && (
            <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
              Subscription started {sub.startedOn}
            </p>
          )}
          {sub.tier === "free" && (
            <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
              You are on the free plan.
            </p>
          )}

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
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
              {sub.tier === "free" ? "Upgrade plan" : "Change plan"}
            </Link>
            {sub.tier === "paid" && (
              <button
                disabled
                style={{
                  background: "transparent",
                  border: "1px solid var(--muted)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.4em 1.1em",
                  fontSize: "0.9rem",
                  color: "var(--muted)",
                  cursor: "not-allowed",
                }}
                title="Contact support to cancel"
              >
                Cancel plan
              </button>
            )}
          </div>

          {sub.tier === "paid" && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              To cancel your subscription, please{" "}
              <a href="mailto:support@mytutoringhub.com" style={{ color: "var(--brand)" }}>
                contact support
              </a>
              .
            </p>
          )}
        </section>

        {/* Invoice history */}
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Invoice history</h2>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Past invoices and payment receipts will appear here.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.75rem" }}>Date</th>
                <th style={{ padding: "0.5rem 0.75rem" }}>Description</th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "0.5rem 0.75rem" }}></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={4}
                  style={{ padding: "1rem 0.75rem", color: "var(--muted)", textAlign: "center" }}
                >
                  No invoices yet
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
