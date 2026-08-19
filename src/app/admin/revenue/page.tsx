import { PRICING_BY_COUNTRY } from "@/lib/pricing";

// Placeholder plan distribution (mock)
const PLAN_DIST = [
  { plan: "Tutor Pro", key: "pro", role: "tutor", count: 42, billingPeriod: "monthly", priceGbp: 9.99 },
  { plan: "Tutor Elite", key: "elite", role: "tutor", count: 18, billingPeriod: "monthly", priceGbp: 19.99 },
  { plan: "Tutor Pro (Annual)", key: "pro_annual", role: "tutor", count: 11, billingPeriod: "annual", priceGbp: 95.88 / 12 },
  { plan: "Tutor Elite (Annual)", key: "elite_annual", role: "tutor", count: 6, billingPeriod: "annual", priceGbp: 191.88 / 12 },
  { plan: "Student Plus", key: "study_plus", role: "student", count: 89, billingPeriod: "monthly", priceGbp: 4.99 },
  { plan: "Student Pro", key: "study_pro", role: "student", count: 34, billingPeriod: "monthly", priceGbp: 9.99 },
  { plan: "Student Plus (Annual)", key: "study_plus_annual", role: "student", count: 21, billingPeriod: "annual", priceGbp: 47.88 / 12 },
  { plan: "Student Pro (Annual)", key: "study_pro_annual", role: "student", count: 9, billingPeriod: "annual", priceGbp: 95.88 / 12 },
];

const SERVICE_FEE_EVENTS = [
  { type: "booking_fee", label: "Booking / First Lesson Fee", count: 128, avgGbp: 1.53, totalGbp: 195.84 },
  { type: "profile_boost", label: "Profile Boost", count: 47, avgGbp: 3.84, totalGbp: 180.48 },
  { type: "paper_bundle", label: "Past Paper Bundle", count: 312, avgGbp: 0.76, totalGbp: 237.12 },
  { type: "group_class", label: "Group Class Listing", count: 19, avgGbp: 2.30, totalGbp: 43.70 },
  { type: "resource_upload", label: "Resource Upload", count: 64, avgGbp: 1.15, totalGbp: 73.60 },
];

const mrr = PLAN_DIST.reduce((acc, p) => acc + p.count * p.priceGbp, 0);
const arr = mrr * 12;
const totalSubscribers = PLAN_DIST.reduce((acc, p) => acc + p.count, 0);
const churnRate = 4.2; // mock %

const gbp = PRICING_BY_COUNTRY["GB"];

export default function RevenuePage() {
  const totalServiceFees = SERVICE_FEE_EVENTS.reduce((a, e) => a + e.totalGbp, 0);

  return (
    <div className="stack-lg">
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Revenue Dashboard</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginTop: -8 }}>
        All figures are estimates based on GBP pricing (
        {gbp.currencySymbol}
        {gbp.tutorPro.monthly}/mo Pro · {gbp.currencySymbol}
        {gbp.tutorElite.monthly}/mo Elite · {gbp.currencySymbol}
        {gbp.studentPlus.monthly}/mo Student Plus). Mock data — TODO: replace with live Prisma aggregation.
      </p>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "MRR (est.)", value: `£${mrr.toFixed(2)}` },
          { label: "ARR (est.)", value: `£${arr.toFixed(0)}` },
          { label: "Total subscribers", value: totalSubscribers },
          { label: "Monthly churn rate", value: `${churnRate}%` },
          { label: "Service fee revenue (MTD)", value: `£${totalServiceFees.toFixed(2)}` },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--surface, #f9fafb)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Revenue by Plan</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                {["Plan", "Role", "Billing", "Subscribers", "Price / mo (est.)", "MRR (est.)"].map(
                  (h) => (
                    <th key={h} style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {PLAN_DIST.map((p, i) => {
                const rowMrr = p.count * p.priceGbp;
                return (
                  <tr
                    key={p.key}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: i % 2 === 0 ? "transparent" : "var(--surface, #f9fafb)",
                    }}
                  >
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{p.plan}</td>
                    <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{p.role}</td>
                    <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{p.billingPeriod}</td>
                    <td style={{ padding: "8px 12px" }}>{p.count}</td>
                    <td style={{ padding: "8px 12px" }}>£{p.priceGbp.toFixed(2)}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>£{rowMrr.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: "10px 12px" }}>
                  Total
                </td>
                <td style={{ padding: "10px 12px" }}>{totalSubscribers}</td>
                <td />
                <td style={{ padding: "10px 12px" }}>£{mrr.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Service fee events */}
      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Service Fee Events (MTD)</h2>
        <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 12 }}>
          Placeholder data — TODO: replace with live Prisma aggregation from ServiceFeeEvent table.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                {["Event type", "Count", "Avg fee (GBP)", "Total (GBP)"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERVICE_FEE_EVENTS.map((e, i) => (
                <tr
                  key={e.type}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "transparent" : "var(--surface, #f9fafb)",
                  }}
                >
                  <td style={{ padding: "8px 12px" }}>{e.label}</td>
                  <td style={{ padding: "8px 12px" }}>{e.count}</td>
                  <td style={{ padding: "8px 12px" }}>£{e.avgGbp.toFixed(2)}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>£{e.totalGbp.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 700 }}>
                <td style={{ padding: "10px 12px" }}>Total</td>
                <td style={{ padding: "10px 12px" }}>
                  {SERVICE_FEE_EVENTS.reduce((a, e) => a + e.count, 0)}
                </td>
                <td />
                <td style={{ padding: "10px 12px" }}>£{totalServiceFees.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
