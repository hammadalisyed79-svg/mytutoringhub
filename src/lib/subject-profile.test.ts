import assert from "node:assert/strict";
import {
  defaultSubjectProfileTitle,
  normalizeSubjectLabel,
  splitSubjectsCsv,
  teachingProfileDocumentTitle,
} from "@/lib/subject-profile";

assert.equal(normalizeSubjectLabel("  Maths  "), "Maths");
assert.deepEqual(splitSubjectsCsv("Maths, Physics; Chemistry|Maths"), [
  "Maths",
  "Physics",
  "Chemistry",
]);
assert.equal(defaultSubjectProfileTitle("Maths", "Hammad"), "Hammad · Maths");
assert.equal(defaultSubjectProfileTitle("Physics"), "Physics tutor");

assert.equal(teachingProfileDocumentTitle("Humanities", "Humanities"), "Humanities");
assert.equal(
  teachingProfileDocumentTitle("Zain Ali · Humanities", "Humanities"),
  "Zain Ali · Humanities",
);
assert.equal(
  teachingProfileDocumentTitle("GCSE Maths · exam prep", "Mathematics"),
  "GCSE Maths · exam prep · Mathematics",
);
assert.equal(teachingProfileDocumentTitle("", "English"), "English");

console.log("subject-profile.test.ts: ok");
