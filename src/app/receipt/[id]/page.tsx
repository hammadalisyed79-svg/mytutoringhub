import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan, getLivePlan } from "@/lib/plans";
import { formatSafepayPriceId } from "@/lib/currency";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Payment receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!sub) notFound();
  if (sub.userId !== session.user.id && session.user.role !== "ADMIN") notFound();
  if (!["ACTIVE", "TRIALING"].includes(sub.status)) notFound();

  const livePlan = await getLivePlan(sub.plan);
  const planName = livePlan?.name || getPlan(sub.plan as never)?.name || sub.plan;
  const isOneTimeAddOn = Boolean(livePlan?.isAddOn || getPlan(sub.plan as never)?.isAddOn);
  const amount = formatSafepayPriceId(sub.stripePriceId) || "Paid via Safepay";
  const paidAt = sub.updatedAt;
  const orderRef = sub.stripeSubscriptionId?.startsWith("track_")
    ? sub.stripeSubscriptionId
    : sub.id;

  const boostWindowDays =
    sub.plan === "AD_BOOST" && sub.billingPeriod === "annual" ? 365 : 30;
  const billingDescription = isOneTimeAddOn
    ? sub.plan === "AD_BOOST"
      ? `One-time purchase — ${boostWindowDays}-day Listing Boost window`
      : sub.plan === "HIGHLIGHTED_AD"
        ? "One-time purchase — 30-day visibility window (legacy Highlight)"
      : sub.plan === "VERIFIED_TUTOR"
        ? "One-time purchase — identity review queue priority"
        : "One-time purchase"
    : sub.billingPeriod === "annual"
      ? "Annual plan — billed for the period purchased"
      : "Monthly plan — billed for the period purchased";

  return (
    <div className="page">
      <div className="container">
        <div className="receipt-actions no-print">
          <p className="success" style={{ margin: 0 }}>
            Payment successful. Save or print this slip for your records.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <PrintButton />
            <Link href="/dashboard" className="btn btn-secondary btn-sm">
              Back to dashboard
            </Link>
          </div>
        </div>

        <article className="receipt-slip">
          <header className="receipt-head">
            <Logo />
            <div>
              <p className="receipt-kicker">Payment receipt</p>
              <h1>My Tutoring Hub</h1>
              <p className="muted">www.mytutoringhub.com</p>
            </div>
          </header>

          <p className="receipt-status">PAID</p>

          <dl className="receipt-meta">
            <div>
              <dt>Customer</dt>
              <dd>
                {sub.user.name}
                <br />
                {sub.user.email}
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>
                {paidAt.toLocaleString("en", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
            <div>
              <dt>Order / tracker</dt>
              <dd className="receipt-mono">{orderRef}</dd>
            </div>
            <div>
              <dt>Receipt no.</dt>
              <dd className="receipt-mono">{sub.id}</dd>
            </div>
          </dl>

          <table className="receipt-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {planName} — {billingDescription}
                  {sub.currentPeriodEnd
                    ? ` (until ${sub.currentPeriodEnd.toLocaleDateString()})`
                    : ""}
                </td>
                <td>{amount}</td>
              </tr>
            </tbody>
          </table>

          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Lesson fees are paid directly to tutors. This receipt is only for the My Tutoring Hub
            platform plan. Payments processed by Safepay.
          </p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Questions: admin@mytutoringhub.com
          </p>
        </article>
      </div>
    </div>
  );
}
