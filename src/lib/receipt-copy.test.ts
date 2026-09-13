import assert from "node:assert/strict";
import {
  isComplimentaryReceipt,
  receiptAmountLabel,
  receiptBillingDescription,
  receiptFooterNote,
  receiptKicker,
  receiptLineDescription,
  receiptPrintLabel,
  receiptStatusLabel,
  receiptSuccessMessage,
} from "@/lib/receipt-copy";

assert.equal(
  isComplimentaryReceipt({ stripePriceId: "promo_complimentary" }),
  true,
);
assert.equal(
  isComplimentaryReceipt({
    stripePriceId: "safepay_PKR_0",
  }),
  true,
);
assert.equal(
  isComplimentaryReceipt({
    stripePriceId: null,
    stripeSubscriptionId: "promo_TUTOR_BASIC_user_1",
  }),
  true,
);
assert.equal(
  isComplimentaryReceipt({
    stripePriceId: "manual_grant",
    stripeSubscriptionId: "manual_admin_123",
  }),
  true,
);
assert.equal(
  isComplimentaryReceipt({ stripePriceId: "safepay_PKR_1999" }),
  false,
);

assert.equal(receiptStatusLabel(true), "FREE");
assert.equal(receiptStatusLabel(false), "PAID");
assert.equal(receiptKicker(true), "Activation confirmation");
assert.equal(receiptKicker(false), "Payment receipt");
assert.equal(receiptPrintLabel(true), "Print / save confirmation");
assert.equal(receiptPrintLabel(false), "Print / save slip");

assert.equal(
  receiptAmountLabel({
    complimentary: true,
    stripePriceId: "promo_complimentary",
    promoLabel: "Launch offer",
  }),
  "PKR 0 — Launch offer",
);
assert.equal(
  receiptAmountLabel({
    complimentary: true,
    stripePriceId: "promo_complimentary",
  }),
  "PKR 0 — Complimentary",
);
assert.match(
  receiptAmountLabel({
    complimentary: false,
    stripePriceId: "safepay_PKR_1999",
  }) || "",
  /PKR|1,?999/,
);
assert.equal(
  receiptAmountLabel({ complimentary: false, stripePriceId: null }),
  "Paid via Safepay",
);

const until = new Date("2026-09-30T23:59:59.999Z");
assert.equal(
  receiptLineDescription({
    planName: "Tutor Pro",
    complimentary: true,
    promoLabel: "Launch offer",
    periodEnd: until,
    isOneTimeAddOn: false,
    plan: "TUTOR_BASIC",
    billingPeriod: "monthly",
  }),
  "Tutor Pro — Launch offer (complimentary until 30 September 2026)",
);
assert.match(
  receiptBillingDescription({
    complimentary: false,
    isOneTimeAddOn: false,
    plan: "TUTOR_BASIC",
    billingPeriod: "monthly",
  }),
  /billed for the period purchased/,
);
assert.match(
  receiptSuccessMessage({ complimentary: true, planName: "Tutor Pro" }),
  /activated free/i,
);
assert.match(
  receiptSuccessMessage({ complimentary: false, planName: "Tutor Pro" }),
  /Payment successful/,
);
assert.match(receiptFooterNote(true), /No payment was charged/);
assert.match(receiptFooterNote(false), /Payments processed by Safepay/);

console.log("receipt-copy.test.ts: ok");
