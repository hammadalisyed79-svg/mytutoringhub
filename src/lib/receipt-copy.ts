import { formatMoney, formatSafepayPriceId, type CurrencyCode } from "@/lib/currency";
import { parseSafepayStoredAmount } from "@/lib/analytics-conversions";
import { formatPromoUntil } from "@/lib/plans";

/** True when this subscription record is a free / promo / manual grant — not a cash payment. */
export function isComplimentaryReceipt(opts: {
  stripePriceId: string | null | undefined;
  stripeSubscriptionId?: string | null;
}): boolean {
  const price = parseSafepayStoredAmount(opts.stripePriceId);
  if (price.complimentary || price.major <= 0) return true;
  if (/complimentary|promo|manual/i.test(opts.stripeSubscriptionId || "")) return true;
  return false;
}

export function receiptStatusLabel(complimentary: boolean): "FREE" | "PAID" {
  return complimentary ? "FREE" : "PAID";
}

export function receiptKicker(complimentary: boolean): string {
  return complimentary ? "Activation confirmation" : "Payment receipt";
}

export function receiptSuccessMessage(opts: {
  complimentary: boolean;
  planName: string;
}): string {
  if (opts.complimentary) {
    return `${opts.planName} activated free. Save or print this confirmation for your records.`;
  }
  return "Payment successful. Save or print this slip for your records.";
}

export function receiptAmountLabel(opts: {
  complimentary: boolean;
  stripePriceId: string | null | undefined;
  promoLabel?: string | null;
  /** Display currency for complimentary zero amounts (visitor or charged currency). */
  currency?: CurrencyCode;
}): string {
  if (opts.complimentary) {
    const offer = opts.promoLabel?.trim();
    const zero = formatMoney(0, opts.currency || "USD");
    return offer ? `${zero} — ${offer}` : `${zero} — Complimentary`;
  }
  return formatSafepayPriceId(opts.stripePriceId) || "Paid via Safepay";
}

export function receiptBillingDescription(opts: {
  complimentary: boolean;
  promoLabel?: string | null;
  periodEnd?: Date | null;
  isOneTimeAddOn: boolean;
  plan: string;
  billingPeriod: string | null | undefined;
}): string {
  if (opts.complimentary) {
    const until = opts.periodEnd ? formatPromoUntil(opts.periodEnd) : "";
    const offer = opts.promoLabel?.trim() || "Complimentary";
    if (until) {
      return opts.promoLabel?.trim()
        ? `${offer} (complimentary until ${until})`
        : `Complimentary until ${until}`;
    }
    return offer === "Complimentary" ? "Complimentary activation" : `${offer} (complimentary)`;
  }

  if (opts.isOneTimeAddOn) {
    if (opts.plan === "AD_BOOST") {
      const days = opts.billingPeriod === "annual" ? 365 : 30;
      return `One-time purchase — ${days}-day Listing Boost window`;
    }
    if (opts.plan === "HIGHLIGHTED_AD") {
      return "One-time purchase — 30-day visibility window (legacy Highlight)";
    }
    if (opts.plan === "VERIFIED_TUTOR") {
      return "One-time purchase — identity review queue priority";
    }
    return "One-time purchase";
  }

  return opts.billingPeriod === "annual"
    ? "Annual plan — billed for the period purchased"
    : "Monthly plan — billed for the period purchased";
}

export function receiptLineDescription(opts: {
  planName: string;
  complimentary: boolean;
  promoLabel?: string | null;
  periodEnd?: Date | null;
  isOneTimeAddOn: boolean;
  plan: string;
  billingPeriod: string | null | undefined;
}): string {
  const billing = receiptBillingDescription(opts);
  if (opts.complimentary) {
    return `${opts.planName} — ${billing}`;
  }
  const until =
    opts.periodEnd && !opts.complimentary
      ? ` (until ${opts.periodEnd.toLocaleDateString()})`
      : "";
  return `${opts.planName} — ${billing}${until}`;
}

export function receiptFooterNote(complimentary: boolean): string {
  if (complimentary) {
    return "Lesson fees are paid directly to tutors. This confirmation is only for your My Tutoring Hub platform plan. No payment was charged.";
  }
  return "Lesson fees are paid directly to tutors. This receipt is only for the My Tutoring Hub platform plan. Payments processed by Safepay.";
}

export function receiptPrintLabel(complimentary: boolean): string {
  return complimentary ? "Print / save confirmation" : "Print / save slip";
}
