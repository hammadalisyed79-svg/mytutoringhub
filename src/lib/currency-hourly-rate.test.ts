import assert from "node:assert/strict";
import {
  hourlyRateInputStep,
  hourlyRateInputToPkr,
  hourlyRateInputValue,
  minHourlyRateInput,
} from "@/lib/currency";

assert.equal(hourlyRateInputStep("PKR"), "any");
assert.equal(hourlyRateInputStep("USD"), "any");
assert.equal(hourlyRateInputStep("GBP"), "any");

assert.equal(hourlyRateInputValue(1499.5, "PKR"), "1499.5");
assert.equal(hourlyRateInputValue(1500, "PKR"), "1500");

// Fractional local amounts must survive conversion (not forced to whole PKR only via step-100).
const pkr = hourlyRateInputToPkr(12.5, "GBP");
assert.ok(pkr > 0);
assert.equal(pkr, Math.round(pkr * 100) / 100);

const minGbp = minHourlyRateInput("GBP");
assert.ok(minGbp > 0);
assert.equal(minGbp, Math.round(minGbp * 100) / 100);

console.log("currency-hourly-rate.test.ts: ok");
