import assert from "node:assert/strict";
import {
  canonicalTeachingSubject,
  canonicalTeachingSubjectKey,
  sameCanonicalSubject,
} from "./teaching-profile-subject";

assert.equal(canonicalTeachingSubject("").source, "empty");
assert.equal(canonicalTeachingSubject("   ").canonical, "");

assert.equal(canonicalTeachingSubject("maths").canonical, "Mathematics");
assert.equal(canonicalTeachingSubject("Maths").matched, true);
assert.equal(canonicalTeachingSubject("Mathematics").canonical, "Mathematics");
assert.equal(canonicalTeachingSubject("math").canonical, "Mathematics");
assert.equal(canonicalTeachingSubject("phy").canonical, "Physics");
assert.equal(canonicalTeachingSubject("chem").canonical, "Chemistry");

assert.equal(canonicalTeachingSubject("GCSE Maths").canonical, "Mathematics");
assert.equal(canonicalTeachingSubject("GCSE Maths").source, "exam_family");
assert.equal(canonicalTeachingSubject("A Level Physics").canonical, "Physics");
assert.equal(canonicalTeachingSubject("IGCSE Maths").canonical, "Mathematics");
assert.equal(canonicalTeachingSubject("IB Maths").canonical, "Mathematics");
assert.equal(canonicalTeachingSubject("O Level Maths").canonical, "Mathematics");
assert.equal(canonicalTeachingSubject("A-Level Chemistry").canonical, "Chemistry");

assert.equal(canonicalTeachingSubject("SAT Prep").canonical, "SAT Prep");
assert.equal(canonicalTeachingSubject("IELTS").canonical, "IELTS");
assert.equal(canonicalTeachingSubject("CSS Prep").canonical, "CSS Prep");
assert.equal(canonicalTeachingSubject("Quran Nazra").canonical, "Quran Nazra");

assert.equal(canonicalTeachingSubject("Chemistry 5070").canonical, "Chemistry");
assert.equal(canonicalTeachingSubject("Chemistry 5070").source, "code_suffix");
assert.equal(canonicalTeachingSubject("Mathematics 0580").canonical, "Mathematics");

assert.equal(canonicalTeachingSubject("  robotics ").canonical, "robotics");
assert.equal(canonicalTeachingSubject("robotics").matched, false);
assert.equal(canonicalTeachingSubject("robotics").source, "verbatim");
assert.equal(sameCanonicalSubject("Robotics", "robotics"), true);

assert.equal(sameCanonicalSubject("Maths", "Mathematics"), true);
assert.equal(sameCanonicalSubject("GCSE Maths", "A Level Maths"), true);
assert.equal(sameCanonicalSubject("Physics", "Chemistry"), false);
assert.equal(sameCanonicalSubject("SAT Prep", "Mathematics"), false);

assert.equal(canonicalTeachingSubjectKey("Maths"), canonicalTeachingSubjectKey("GCSE Maths"));
assert.ok(canonicalTeachingSubject("General tutoring").canonical.length > 0);
assert.equal(canonicalTeachingSubject("General tutoring").matched, false);

console.log("teaching-profile-subject.test.ts: ok");
