import assert from "node:assert/strict";
import { parseSafepayStoredAmount } from "@/lib/analytics-conversions";

/** Revenue intelligence cash rules (unit). */
assert.equal(parseSafepayStoredAmount("safepay_PKR_3499").major, 3499);
assert.equal(parseSafepayStoredAmount("safepay_USD_1999").major, 19.99);
assert.equal(parseSafepayStoredAmount("promo_complimentary").major, 0);
assert.ok(parseSafepayStoredAmount("promo_complimentary").complimentary);

// Complimentary Tutor Pro must never count as paid revenue
const comp = parseSafepayStoredAmount("promo_complimentary");
const paidValue = comp.complimentary ? 0 : comp.major;
assert.equal(paidValue, 0);

console.log("revenue-intelligence.test.ts: ok");
