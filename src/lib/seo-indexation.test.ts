import assert from "node:assert/strict";
import {
  pastPaperFiltersShouldNoIndex,
  searchResultsShouldNoIndex,
  subjectLandingShouldNoIndex,
} from "@/lib/seo-indexation";

assert.equal(searchResultsShouldNoIndex({}), false);
assert.equal(searchResultsShouldNoIndex({ page: "1" }), false);
assert.equal(searchResultsShouldNoIndex({ page: "2" }), true);
assert.equal(searchResultsShouldNoIndex({ subject: "Maths" }), true);
assert.equal(searchResultsShouldNoIndex({ q: "biology" }), true);
assert.equal(searchResultsShouldNoIndex({ country: "Pakistan" }), true);

assert.equal(pastPaperFiltersShouldNoIndex({}), false);
assert.equal(pastPaperFiltersShouldNoIndex({ year: "2024" }), true);
assert.equal(pastPaperFiltersShouldNoIndex({ session: "June" }), true);
assert.equal(pastPaperFiltersShouldNoIndex({ documentType: "qp" }), true);

assert.equal(subjectLandingShouldNoIndex(0), true);
assert.equal(subjectLandingShouldNoIndex(3), false);
assert.equal(subjectLandingShouldNoIndex(2, { isCity: true }), true);
assert.equal(subjectLandingShouldNoIndex(3, { isCity: true }), false);
assert.equal(subjectLandingShouldNoIndex(2, { isCity: false }), false);

console.log("seo-indexation.test.ts: ok");
