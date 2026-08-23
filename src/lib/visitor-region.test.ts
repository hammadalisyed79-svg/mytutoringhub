import assert from "node:assert/strict";
import { getVisitorRegionForCode } from "@/lib/visitor-region";

const pk = getVisitorRegionForCode("PK");
assert.ok(pk.searchPlaceholder.includes("Islamabad"));
assert.ok(pk.searchPlaceholder.includes("FBISE-HSSC-MATH"));
assert.ok(pk.searchQueryPlaceholder.includes("Maths Islamabad"));

const gb = getVisitorRegionForCode("GB");
assert.ok(gb.searchPlaceholder.includes("London"));
assert.ok(gb.searchPlaceholder.includes("AQA-GCSE-MATH"));
assert.ok(gb.cityPlaceholder.includes("London"));

const us = getVisitorRegionForCode("US");
assert.ok(us.searchPlaceholder.includes("New York"));
assert.ok(us.searchPlaceholder.includes("Math "));

const fallback = getVisitorRegionForCode(null);
assert.equal(fallback.countryName, "United Kingdom");

console.log("visitor-region.test.ts: ok");
