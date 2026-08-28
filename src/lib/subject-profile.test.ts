import assert from "node:assert/strict";
import {
  defaultSubjectProfileTitle,
  normalizeSubjectLabel,
  splitSubjectsCsv,
} from "@/lib/subject-profile";

assert.equal(normalizeSubjectLabel("  Maths  "), "Maths");
assert.deepEqual(splitSubjectsCsv("Maths, Physics; Chemistry|Maths"), [
  "Maths",
  "Physics",
  "Chemistry",
]);
assert.equal(defaultSubjectProfileTitle("Maths", "Hammad"), "Hammad · Maths");
assert.equal(defaultSubjectProfileTitle("Physics"), "Physics tutor");

console.log("subject-profile.test.ts: ok");
