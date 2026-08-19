import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserPlan, getMonthlyUsage } from "@/lib/plan-limits";

export const metadata = { title: "My Plan — Student Dashboard" };
export const dynamic = "force-dynamic";

const STUDENT_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    features: [
      "Search tutors",
      "3 tutor contacts / month",
      "Access free past papers",
    ],
  },
  {
    id: "plus",
    name: "Study Plus",
    price: "From $5.99/mo",
    features: [
      "Unlimited tutor contacts",
      "Full past paper library",
      "Progress tracking",
    ],
    highlight: true,
  },
  {
    id: "pro",
    name: "Study Pro",
    price: "From $11.99/mo",
    features: [
      "Everything in Study Plus",
      "AI study assistant",
      "Exam countdown reminders",
      "Priority support",
    ],
    highlight: false,
  },
];

export default async function StudentPlanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const [planSlug, contactsUsed] = await Promise.all([
    getUserPlan(session.user.id).catch(() => "free"),
    getMonthlyUsage(session.user.id, "tutor_contact").catch(() => 0),
  ]);

  const isPaid =
    planSlug.includes("student_pass") ||
    planSlug.includes("student_plus") ||
    planSlug.includes("student_pro") ||
    planSlug.includes("plus") ||
    planSlug.includes("pro");

  const tier: "free" | "plus" | "pro" = planSlug.includes("pro") && isPaid
    ? "pro"
    : isPaid
    ? "plus"
    : "free";

  const plan = {
    tier,
    name: tier === "pro" ? "Study Pro" : tier === "plus" ? "Study Plus" : "Free",
    price: null as null | string,
    billingPeriod: null as null | string,
    renewsOn: null as null | string,
    contactsUsed,
    contactsLimit: isPaid ? -1 : 3,
    pastPaperAccess: isPaid ? ("full" as "full") : ("limited" as "limited"),
  };

  const pct =
    plan.contactsLimit > 0
      ? Math.min(100, (plan.contactsUsed / plan.contactsLimit) * 100)
      : 0;


  const badgeColor =
    plan.tier === "pro" ? "var(--accent)" : plan.tier === "plus" ? "var(--ok)" : "var(--muted)";

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 820 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link href="/dashboard" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            ← Dashboard
          </Link>
        </div>
        <h1 className="page-title">My Plan</h1>

        {/* Current plan card */}
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
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
              {plan.tier === "free" && (
                <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                  Free plan — limited features
                </p>
              )}
              {plan.price && plan.tier !== "free" && (
                <p style={{ marginTop: "0.4rem", fontWeight: 600, fontSize: "1.1rem" }}>
                  {plan.price}
                  {plan.billingPeriod && (
                    <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.9rem" }}>
                      {" "}
                      · billed {plan.billingPeriod}
                    </span>
                  )}
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

          <ul
            style={{
              margin: "1rem 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            {STUDENT_PLANS.find((p) => p.id === plan.tier)?.features.map((f) => (
              <li
                key={f}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}
              >
                <span style={{ color: "var(--ok)" }}>✓</span> {f}
              </li>
            ))}
          </ul>
        </section>

        {/* Usage meters */}
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Usage this month</h2>

          {/* Tutor contacts */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
              <span>Tutor contacts</span>
              <span style={{ color: "var(--muted)" }}>
                {plan.contactsUsed} / {plan.tier === "free" ? plan.contactsLimit : "∞"}
              </span>
            </div>
            {plan.tier === "free" && (
              <>
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
                    Almost at limit.{" "}
                    <Link href="/pricing" style={{ color: "var(--accent)", fontWeight: 600 }}>
                      Upgrade to Study Plus
                    </Link>{" "}
                    for unlimited contacts.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Past paper access */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.88rem" }}>
            <span>Past paper access</span>
            <span
              style={{
                background: plan.pastPaperAccess === "full" ? "var(--ok)" : "var(--muted)",
                color: "#fff",
                borderRadius: "999px",
                padding: "0.12em 0.65em",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {plan.pastPaperAccess === "full" ? "Full library" : "Free papers only"}
            </span>
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
              {STUDENT_PLANS.filter((p) => p.id !== "free").map((up) => (
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
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
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

        <div className="panel">
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            <Link href="/pricing" style={{ color: "var(--brand)", fontWeight: 600 }}>
              View full plan comparison →
            </Link>
          </p>
        </div>

        {/* Study tools */}
        <section style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Study Tools
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {[
              {
                href: "/study/countdown",
                icon: "⏳",
                title: "Exam Countdown",
                desc: "Live countdowns for Cambridge, Edexcel, AQA, FBISE, and Matric sessions.",
              },
              {
                href: "/study/progress",
                icon: "📚",
                title: "My Study Log",
                desc: "Track your study sessions and see your weekly progress at a glance.",
              },
              {
                href: "/study/assistant",
                icon: "🤖",
                title: "AI Study Assistant",
                desc: "Get exam Q&A, essay feedback, and revision plans (Study Pro).",
              },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  padding: "1rem",
                  borderRadius: "var(--radius)",
                  border: "1.5px solid var(--border)",
                  background: "var(--paper)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.15s",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>{tool.icon}</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--brand)" }}>
                  {tool.title}
                </span>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{tool.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
