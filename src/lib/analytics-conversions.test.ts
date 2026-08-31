import assert from "node:assert/strict";
import {
  purchaseEventForPlan,
  sanitizeConversionParams,
  GOOGLE_ADS_PRIMARY_STUDENT,
} from "@/lib/analytics-conversions";

assert.equal(purchaseEventForPlan("STUDENT_PASS", { value: 1999 })?.event, "student_pass_purchase");
assert.equal(purchaseEventForPlan("STUDENT_PASS", { value: 1999 })?.value, 1999);
assert.equal(purchaseEventForPlan("TUTOR_BASIC", { complimentary: true, value: 1499 })?.value, 0);
assert.equal(purchaseEventForPlan("AD_BOOST", { value: 999 })?.event, "listing_boost_purchase");
assert.equal(purchaseEventForPlan("VERIFIED_TUTOR", { value: 2999 })?.event, "priority_verification_purchase");
assert.equal(purchaseEventForPlan("HIGHLIGHTED_AD"), null);

const clean = sanitizeConversionParams({
  email: "x@y.com",
  subject: "Maths",
  value: 100,
  phone: "0300",
  listingId: "abc",
});
assert.equal(clean.email, undefined);
assert.equal(clean.phone, undefined);
assert.equal(clean.subject, "Maths");
assert.equal(clean.value, 100);
assert.ok(GOOGLE_ADS_PRIMARY_STUDENT.includes("student_tutor_contact"));

console.log("analytics-conversions.test.ts: ok");
