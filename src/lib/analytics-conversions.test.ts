import assert from "node:assert/strict";
import {
  purchaseEventForPlan,
  checkoutStartedEventForPlan,
  purchaseAttributionParams,
  parseSafepayStoredAmount,
  sanitizeConversionParams,
  GOOGLE_ADS_PRIMARY_STUDENT,
} from "@/lib/analytics-conversions";

assert.equal(purchaseEventForPlan("STUDENT_PASS", { value: 1999 })?.event, "student_pass_purchase");
assert.equal(purchaseEventForPlan("STUDENT_PASS", { value: 1999 })?.value, 1999);
assert.equal(purchaseEventForPlan("TUTOR_BASIC", { complimentary: true, value: 1499 })?.value, 0);
assert.equal(purchaseEventForPlan("AD_BOOST", { value: 999 })?.event, "listing_boost_purchase");
assert.equal(purchaseEventForPlan("VERIFIED_TUTOR", { value: 2999 })?.event, "priority_verification_purchase");
assert.equal(purchaseEventForPlan("HIGHLIGHTED_AD"), null);

assert.equal(checkoutStartedEventForPlan("STUDENT_PASS"), "student_pass_checkout_started");
assert.equal(checkoutStartedEventForPlan("STUDENT_PRO"), "student_pro_checkout_started");
assert.equal(checkoutStartedEventForPlan("TUTOR_BASIC"), "tutor_pro_checkout_started");
assert.equal(checkoutStartedEventForPlan("AD_BOOST"), "listing_boost_checkout_started");
assert.equal(checkoutStartedEventForPlan("VERIFIED_TUTOR"), "priority_verification_checkout_started");

const attrs = purchaseAttributionParams({
  product: "Student Pass",
  plan: "STUDENT_PASS",
  billingPeriod: "monthly",
  currency: "PKR",
  actualPaidValue: 1999,
  transactionId: "sub_abc",
  paymentSource: "safepay",
});
assert.equal(attrs.plan, "STUDENT_PASS");
assert.equal(attrs.billing_period, "monthly");
assert.equal(attrs.actual_paid_value, 1999);
assert.equal(attrs.transaction_id, "sub_abc");
assert.equal(attrs.payment_source, "safepay");

assert.equal(parseSafepayStoredAmount("safepay_PKR_1999").major, 1999);
assert.equal(parseSafepayStoredAmount("safepay_PKR_1999").complimentary, false);
assert.equal(parseSafepayStoredAmount("promo_complimentary").complimentary, true);
assert.equal(parseSafepayStoredAmount("promo_complimentary").major, 0);

const clean = sanitizeConversionParams({
  email: "x@y.com",
  subject: "Maths",
  value: 100,
  phone: "0300",
  listingId: "abc",
  message: "hello",
});
assert.equal(clean.email, undefined);
assert.equal(clean.phone, undefined);
assert.equal(clean.message, undefined);
assert.equal(clean.subject, "Maths");
assert.equal(clean.value, 100);
assert.ok(GOOGLE_ADS_PRIMARY_STUDENT.includes("student_tutor_contact"));

console.log("analytics-conversions.test.ts: ok");
