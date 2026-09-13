import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan, getLivePlan } from "@/lib/plans";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { ConversionBeacon } from "@/components/ConversionBeacon";
import {
  purchaseAttributionParams,
  purchaseEventForPlan,
  parseSafepayStoredAmount,
} from "@/lib/analytics-conversions";
import {
  isComplimentaryReceipt,
  receiptAmountLabel,
  receiptFooterNote,
  receiptKicker,
  receiptLineDescription,
  receiptPrintLabel,
  receiptStatusLabel,
  receiptSuccessMessage,
} from "@/lib/receipt-copy";

export const metadata = { title: "Receipt" };

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

  const complimentary = isComplimentaryReceipt({
    stripePriceId: sub.stripePriceId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
  });
  const promoLabel = complimentary
    ? livePlan?.promoLabel || getPlan(sub.plan as never)?.promoLabel || null
    : null;
  const periodEnd = sub.currentPeriodEnd;
  const amount = receiptAmountLabel({
    complimentary,
    stripePriceId: sub.stripePriceId,
    promoLabel,
  });
  const lineDescription = receiptLineDescription({
    planName,
    complimentary,
    promoLabel,
    periodEnd,
    isOneTimeAddOn,
    plan: sub.plan,
    billingPeriod: sub.billingPeriod,
  });
  const paidAt = sub.updatedAt;
  const orderRef = sub.stripeSubscriptionId?.startsWith("track_")
    ? sub.stripeSubscriptionId
    : sub.id;

  const priceMatch = parseSafepayStoredAmount(sub.stripePriceId);
  const currency = priceMatch.currency || "PKR";
  const major = priceMatch.major;
  const purchase = purchaseEventForPlan(sub.plan, {
    complimentary,
    value: complimentary ? 0 : major,
  });
  const paymentSource = complimentary
    ? /manual/i.test(sub.stripeSubscriptionId || "") ||
      /manual/i.test(sub.stripePriceId || "")
      ? ("manual" as const)
      : ("complimentary" as const)
    : ("safepay" as const);

  return (
    <div className="page">
      <div className="container">
        {purchase ? (
          <ConversionBeacon
            event={purchase.event}
            dedupeKey={`purchase_${sub.id}`}
            params={purchaseAttributionParams({
              product: planName,
              plan: sub.plan,
              billingPeriod: sub.billingPeriod || (isOneTimeAddOn ? "once" : "monthly"),
              currency,
              actualPaidValue: purchase.value,
              transactionId: sub.id,
              paymentSource,
            })}
          />
        ) : null}
        <div className="receipt-actions no-print">
          <p className="success" style={{ margin: 0 }}>
            {receiptSuccessMessage({ complimentary, planName })}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <PrintButton label={receiptPrintLabel(complimentary)} />
            <Link href="/dashboard" className="btn btn-secondary btn-sm">
              Back to dashboard
            </Link>
          </div>
        </div>

        <article className="receipt-slip">
          <header className="receipt-head">
            <Logo />
            <div>
              <p className="receipt-kicker">{receiptKicker(complimentary)}</p>
              <h1>My Tutoring Hub</h1>
              <p className="muted">www.mytutoringhub.com</p>
            </div>
          </header>

          <p className="receipt-status">{receiptStatusLabel(complimentary)}</p>

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
                <td>{lineDescription}</td>
                <td>{amount}</td>
              </tr>
            </tbody>
          </table>

          <p className="muted" style={{ fontSize: "0.9rem" }}>
            {receiptFooterNote(complimentary)}
          </p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Questions: admin@mytutoringhub.com
          </p>
        </article>
      </div>
    </div>
  );
}
