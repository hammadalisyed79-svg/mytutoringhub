import assert from "node:assert/strict";
import {
  isBlockedTeachingSubject,
  teachingProfileEditorValues,
  teachingProfileSubjectChoices,
  teachingProfileTaxonomyLine,
} from "./teaching-profile-dashboard";

assert.equal(isBlockedTeachingSubject("General tutoring"), true);
assert.equal(isBlockedTeachingSubject("General"), true);
assert.equal(isBlockedTeachingSubject("Mathematics"), false);
assert.deepEqual(
  teachingProfileSubjectChoices(["Mathematics", "General tutoring", "Physics", "general", "Mathematics"]),
  ["Mathematics", "Physics"],
);

{
  const fromJoin = teachingProfileEditorValues({
    subject: "Mathematics",
    level: "All levels",
    board: null,
    qualification: null,
    syllabusCode: null,
    capabilities: [
      { kind: "LEVEL", value: "GCSE" },
      { kind: "LEVEL", value: "A Level" },
      { kind: "BOARD", value: "Cambridge" },
      { kind: "BOARD", value: "Edexcel" },
      { kind: "SYLLABUS_CODE", value: "0580" },
      { kind: "SYLLABUS_CODE", value: "9709" },
    ],
  });
  assert.deepEqual(fromJoin.levels, ["GCSE", "A Level"]);
  assert.deepEqual(fromJoin.boards, ["Cambridge", "Edexcel"]);
  assert.deepEqual(fromJoin.syllabusCodes, ["0580", "9709"]);
  assert.match(
    teachingProfileTaxonomyLine({ subject: "Mathematics", capabilities: [
      { kind: "BOARD", value: "Cambridge" },
      { kind: "LEVEL", value: "GCSE" },
      { kind: "SYLLABUS_CODE", value: "0580" },
    ] }),
    /Mathematics · Cambridge · GCSE · 0580/,
  );
}

{
  const fromScalars = teachingProfileEditorValues({
    subject: "Chemistry",
    level: "O Level",
    board: "Cambridge",
    qualification: "O Level",
    syllabusCode: "5070",
  });
  assert.deepEqual(fromScalars.levels, ["O Level"]);
  assert.deepEqual(fromScalars.syllabusCodes, ["5070"]);
}

console.log("teaching-profile-dashboard.test.ts: ok");
