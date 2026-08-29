import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_PLANS.map((p) => [p.id, p.name]),
);

const FEE_LABELS: Record<string, string> = {
  booking_fee: "Booking / First Lesson Fee",
  profile_boost: "Listing Boost",
  paper_bundle: "Past Paper Bundle",
  group_class: "Group Class Listing",
  resource_upload: "Resource Upload",
  past_paper: "Past Paper Download",
};

function isActiveStatus(status: string) {
  return status === "ACTIVE" || status === "TRIALING";
}

function monthlyAmount(priceAmount: number | null, billingPeriod: string | null) {
  const amount = priceAmount ?? 0;
  if (!amount) return 0;
  return billingPeriod === "annual" ? amount / 12 : amount;
}

export default async function RevenuePage() {
  await requireAdminPage();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [subscriptions, pastPaperPaid, feeEvents, canceledThisMonth, activeCount] =
    await Promise.all([
      prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        select: {
          plan: true,
          status: true,
          billingPeriod: true,
          priceAmount: true,
          currency: true,
          role: true,
          user: { select: { role: true } },
        },
      }),
      prisma.pastPaperPurchase.findMany({
        where: { status: "PAID", createdAt: { gte: monthStart } },
        select: { amountPkr: true },
      }),
      prisma.serviceFeeEvent
        .findMany({
          where: { createdAt: { gte: monthStart } },
          select: { eventType: true, amount: true, currency: true },
        })
        .catch(() => [] as { eventType: string; amount: number; currency: string }[]),
      prisma.subscription.count({
        where: {
          status: "CANCELED",
          cancelledAt: { gte: monthStart },
        },
      }),
      prisma.subscription.count({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
      }),
    ]);

  type PlanBucket = {
    plan: string;
    label: string;
    role: string;
    billingPeriod: string;
    count: number;
    pricePerMo: number;
    mrr: number;
  };

  const buckets = new Map<string, PlanBucket>();
  let mrr = 0;

  for (const s of subscriptions) {
    if (!isActiveStatus(s.status)) continue;
    const role =
      s.role?.toLowerCase() ||
      (s.user.role === "TUTOR" ? "tutor" : s.user.role === "STUDENT" ? "student" : "other");
    const billingPeriod = s.billingPeriod || "monthly";
    const key = `${s.plan}|${billingPeriod}|${role}`;
    const perMo = monthlyAmount(s.priceAmount, billingPeriod);
    mrr += perMo;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.mrr += perMo;
      existing.pricePerMo =
        existing.count > 0 ? existing.mrr / existing.count : existing.pricePerMo;
    } else {
      buckets.set(key, {
        plan: s.plan,
        label: PLAN_LABELS[s.plan] ?? s.plan,
        role,
        billingPeriod,
        count: 1,
        pricePerMo: perMo,
        mrr: perMo,
      });
    }
  }

  const planDist = [...buckets.values()].sort((a, b) => b.mrr - a.mrr);
  const totalSubscribers = planDist.reduce((a, p) => a + p.count, 0);
  const arr = mrr * 12;
  const churnRate =
    activeCount + canceledThisMonth > 0
      ? (canceledThisMonth / (activeCount + canceledThisMonth)) * 100
      : 0;

  const feeByType = new Map<string, { count: number; total: number }>();
  for (const e of feeEvents) {
    const cur = feeByType.get(e.eventType) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += e.amount;
    feeByType.set(e.eventType, cur);
  }

  // Past paper purchases are the live one-off product; include even if ServiceFeeEvent is empty.
  const paperTotalPkr = pastPaperPaid.reduce((a, p) => a + p.amountPkr, 0);
  if (pastPaperPaid.length > 0) {
    const cur = feeByType.get("past_paper") || { count: 0, total: 0 };
    cur.count += pastPaperPaid.length;
    cur.total += paperTotalPkr;
    feeByType.set("past_paper", cur);
  }

  const serviceFeeRows = [...feeByType.entries()].map(([type, v]) => ({
    type,
    label: FEE_LABELS[type] ?? type,
    count: v.count,
    avg: v.count ? v.total / v.count : 0,
    total: v.total,
  }));
  const totalServiceFees = serviceFeeRows.reduce((a, e) => a + e.total, 0);

  return (
    <div className="stack-lg">
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Revenue Dashboard</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginTop: -8 }}>
        Live Prisma data from Subscription, PastPaperPurchase, and ServiceFeeEvent. MRR uses stored{" "}
        <code>priceAmount</code> when present (often 0 for complimentary Tutor Pro). Past paper
        totals are in PKR.
      </p>

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
          { label: "Active subscriptions", value: totalSubscribers },
          { label: "Cancel rate (MTD)", value: `${churnRate.toFixed(1)}%` },
          {
            label: "One-off revenue (MTD)",
            value:
              totalServiceFees > 0
                ? `${totalServiceFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : "0",
          },
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

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Revenue by Plan</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                {["Plan", "Role", "Billing", "Subscribers", "Avg / mo", "MRR (est.)"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planDist.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: "#9ca3af" }}>
                    No active subscriptions yet.
                  </td>
                </tr>
              )}
              {planDist.map((p, i) => (
                <tr
                  key={`${p.plan}-${p.billingPeriod}-${p.role}`}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "transparent" : "var(--surface, #f9fafb)",
                  }}
                >
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{p.label}</td>
                  <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{p.role}</td>
                  <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>
                    {p.billingPeriod}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{p.count}</td>
                  <td style={{ padding: "8px 12px" }}>£{p.pricePerMo.toFixed(2)}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>£{p.mrr.toFixed(2)}</td>
                </tr>
              ))}
              {planDist.length > 0 && (
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: "10px 12px" }}>
                    Total
                  </td>
                  <td style={{ padding: "10px 12px" }}>{totalSubscribers}</td>
                  <td />
                  <td style={{ padding: "10px 12px" }}>£{mrr.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
          One-off fees &amp; purchases (MTD)
        </h2>
        <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 12 }}>
          Listing Boost (AD_BOOST) checkout is live via Safepay — booking fees, group classes,
          and resource uploads are not live yet; only recorded ServiceFeeEvent rows and paid past
          paper downloads appear here.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                {["Event type", "Count", "Avg amount", "Total"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {serviceFeeRows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: "24px 12px", textAlign: "center", color: "#9ca3af" }}
                  >
                    No one-off fee events or past paper purchases this month.
                  </td>
                </tr>
              )}
              {serviceFeeRows.map((e, i) => (
                <tr
                  key={e.type}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "transparent" : "var(--surface, #f9fafb)",
                  }}
                >
                  <td style={{ padding: "8px 12px" }}>{e.label}</td>
                  <td style={{ padding: "8px 12px" }}>{e.count}</td>
                  <td style={{ padding: "8px 12px" }}>{e.avg.toFixed(2)}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{e.total.toFixed(2)}</td>
                </tr>
              ))}
              {serviceFeeRows.length > 0 && (
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 700 }}>
                  <td style={{ padding: "10px 12px" }}>Total</td>
                  <td style={{ padding: "10px 12px" }}>
                    {serviceFeeRows.reduce((a, e) => a + e.count, 0)}
                  </td>
                  <td />
                  <td style={{ padding: "10px 12px" }}>{totalServiceFees.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
