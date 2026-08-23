import assert from "node:assert/strict";
import { formatHourly } from "@/lib/currency";

// Mirrors tutorPickListHtml rate line — must not double-append /hr.
function tutorPickRateSnippet(hourlyRatePkr: number, currency: "PKR" = "PKR") {
  const rate = formatHourly(hourlyRatePkr, currency);
  return `Mathematics · Online · ${rate}`;
}

{
  const line = tutorPickRateSnippet(5000);
  assert.match(line, /\/hr$/);
  assert.ok(!line.includes("/hr/hr"), `unexpected duplicate /hr in: ${line}`);
}

console.log("email-sequences.render.test.ts: ok");
