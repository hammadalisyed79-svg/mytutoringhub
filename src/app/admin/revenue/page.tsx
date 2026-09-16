import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLANS } from "@/lib/plans";
import { parseSafepayStoredAmount } from "@/lib/analytics-conversions";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_PLANS.map((p) => [p.id, p.name]),
);

function isActiveStatus(status: string) {
  return status === "ACTIVE" || status === "TRIALING";
}

function monthlyFromCash(cash: number, billingPeriod: string | null) {
  if (!cash) return 0;
  if (billingPeriod === "once") return 0;
  return billingPeriod === "annual" ? cash / 12 : cash;
}

export default async function RevenuePage() {
  await requireAdminPage();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [subscriptions, mtdSubs, pastPaperPaid, canceledThisMonth, activeCount] =
    await Promise.all([
      prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        select: {
          plan: true,
          status: true,
          billingPeriod: true,
          priceAmount: true,
          stripePriceId: true,
          currency: true,
          role: true,
          user: { select: { role: true } },
        },
      }),
      prisma.subscription.findMany({
        where: {
          createdAt: { gte: monthStart },
          status: { in: ["ACTIVE", "TRIALING"] },
          plan: {
            in: ["STUDENT_PASS", "STUDENT_PRO", "TUTOR_BASIC", "AD_BOOST", "VERIFIED_TUTOR"],
          },
        },
        select: { plan: true, stripePriceId: true, billingPeriod: true },
      }),
      prisma.pastPaperPurchase.findMany({
        where: { status: "PAID", createdAt: { gte: monthStart }, amountPkr: { gt: 0 } },
        select: { amountPkr: true },
      }),
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
    paidCount: number;
    mrr: number;
    cashMtd: number;
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
    const parsed = parseSafepayStoredAmount(s.stripePriceId);
    const cash = parsed.complimentary ? 0 : parsed.major;
    const perMo =
      monthlyFromCash(cash, billingPeriod) ||
      monthlyFromCash(s.priceAmount ?? 0, billingPeriod);
    mrr += perMo;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      if (cash > 0) existing.paidCount += 1;
      existing.mrr += perMo;
    } else {
      buckets.set(key, {
        plan: s.plan,
        label: PLAN_LABELS[s.plan] ?? s.plan,
        role,
        billingPeriod,
        count: 1,
        paidCount: cash > 0 ? 1 : 0,
        mrr: perMo,
        cashMtd: 0,
      });
    }
  }

  const mtdCashByPlan: Record<string, number> = {};
  let mtdSubscriptionCash = 0;
  for (const s of mtdSubs) {
    const parsed = parseSafepayStoredAmount(s.stripePriceId);
    const cash = parsed.complimentary ? 0 : parsed.major;
    mtdSubscriptionCash += cash;
    mtdCashByPlan[s.plan] = (mtdCashByPlan[s.plan] || 0) + cash;
  }

  const paperTotalPkr = pastPaperPaid.reduce((a, p) => a + p.amountPkr, 0);
  const totalMtdCash = mtdSubscriptionCash + paperTotalPkr;

  const planDist = [...buckets.values()].sort((a, b) => b.mrr - a.mrr);
  const totalSubscribers = planDist.reduce((a, p) => a + p.count, 0);
  const arr = mrr * 12;
  const churnRate =
    activeCount + canceledThisMonth > 0
      ? (canceledThisMonth / (activeCount + canceledThisMonth)) * 100
      : 0;

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Revenue</h1>
        <p className="muted">
          Analytics — actual cash from Safepay-encoded <code>stripePriceId</code> (complimentary = 0)
          plus paid past papers. No forecasts. Checkout recovery:{" "}
          <Link href="/admin/payments">Payments</Link>. Plan entitlements:{" "}
          <Link href="/admin/subscriptions">Subscriptions</Link>.{" "}
          <Link href="/admin/revenue/funnel">Open funnel KPIs →</Link>
        </p>
      </div>

      <div className="admin-kpi-grid">
        {[
          { label: "Actual platform cash (MTD)", value: totalMtdCash.toLocaleString() },
          { label: "MRR (paid recurring est.)", value: mrr.toFixed(2) },
          { label: "ARR (est.)", value: arr.toFixed(0) },
          { label: "Active subscriptions", value: totalSubscribers },
          { label: "Cancel rate (MTD)", value: `${churnRate.toFixed(1)}%` },
          { label: "Past paper cash (MTD PKR)", value: paperTotalPkr.toLocaleString() },
        ].map((card) => (
          <div key={card.label} className="admin-kpi">
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </div>
        ))}
      </div>

      <section className="panel">
        <h2>MTD cash by product (paid only)</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Cash (MTD)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Student Pass", mtdCashByPlan.STUDENT_PASS || 0],
                ["Student Pro", mtdCashByPlan.STUDENT_PRO || 0],
                ["Tutor Pro (paid)", mtdCashByPlan.TUTOR_BASIC || 0],
                ["Listing Boost", mtdCashByPlan.AD_BOOST || 0],
                ["Priority Verification", mtdCashByPlan.VERIFIED_TUTOR || 0],
                ["Past papers", paperTotalPkr],
              ].map(([label, value]) => (
                <tr key={String(label)}>
                  <td>{label}</td>
                  <td>
                    <strong>{Number(value).toLocaleString()}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Active plan mix</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {["Plan", "Role", "Billing", "Active", "Paid", "MRR (est.)"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planDist.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center" }}>
                    No active subscriptions yet.
                  </td>
                </tr>
              )}
              {planDist.map((p) => (
                <tr key={`${p.plan}-${p.billingPeriod}-${p.role}`}>
                  <td>
                    <strong>{p.label}</strong>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{p.role}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.billingPeriod}</td>
                  <td>{p.count}</td>
                  <td>{p.paidCount}</td>
                  <td>
                    <strong>{p.mrr.toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
