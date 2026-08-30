import assert from "node:assert/strict";
import {
  capabilitiesFromListingInput,
  capabilitiesFromMultiValue,
} from "@/lib/teaching-profile-capabilities";
import {
  shouldSkipFirstTeachingProfileCreate,
  teachingProfilePersistFields,
} from "@/lib/teaching-profile-write";

{
  const fields = teachingProfilePersistFields(
    {
      subject: "Maths",
      rate: 2000,
      description: "GCSE and A Level Mathematics with weekly past-paper practice.",
      online: true,
      inPerson: false,
      location: "London",
      country: "United Kingdom",
      levels: ["GCSE", "A Level"],
      boards: ["Cambridge", "Edexcel"],
      qualifications: ["GCSE", "A Level"],
      syllabusCodes: ["0580", "9709"],
    },
    { tutorName: "Sara Ahmed" },
  );
  assert.equal(fields.subject, "Maths");
  assert.equal(fields.canonicalSubject, "Mathematics");
  assert.equal(fields.level, "GCSE", "scalar cache uses first level");
  assert.equal(fields.board, "Cambridge");
  assert.equal(fields.syllabusCode, "0580");
  assert.equal(fields.rate, 2000);
  assert.ok(fields.capabilities.some((row) => row.kind === "LEVEL" && row.value === "A Level"));
  assert.ok(fields.capabilities.some((row) => row.kind === "BOARD" && row.value === "Edexcel"));
  assert.ok(fields.capabilities.some((row) => row.kind === "SYLLABUS_CODE" && row.value === "9709"));
  assert.notEqual(fields.subject.toLowerCase(), "general tutoring");
  assert.notEqual(fields.canonicalSubject.toLowerCase(), "general tutoring");
}

assert.throws(
  () =>
    teachingProfilePersistFields({
      subject: "",
      rate: 2000,
      description: "x",
      online: true,
      inPerson: false,
    }),
  /subject/i,
);

assert.throws(
  () =>
    teachingProfilePersistFields({
      subject: "   ",
      rate: 2000,
      description: "x",
      online: true,
      inPerson: false,
    }),
  /subject/i,
);

{
  const multi = capabilitiesFromMultiValue({
    levels: ["GCSE", "A Level"],
    boards: ["Cambridge"],
    qualifications: [],
    syllabusCodes: ["0580"],
  });
  assert.deepEqual(
    multi.map((row) => `${row.kind}:${row.value}`),
    ["LEVEL:GCSE", "LEVEL:A Level", "BOARD:Cambridge", "SYLLABUS_CODE:0580"],
  );
}

{
  const fromArrays = capabilitiesFromListingInput({
    levels: ["GCSE", "A Level"],
    boards: ["Cambridge"],
    level: "ignored-scalar",
    board: "ignored-scalar",
  });
  assert.equal(fromArrays.filter((row) => row.kind === "LEVEL").length, 2);
}

{
  const fromScalars = capabilitiesFromListingInput({
    level: "A Level",
    board: "Cambridge",
    qualification: "",
    syllabusCode: "9709",
  });
  assert.deepEqual(fromScalars, [
    { kind: "LEVEL", value: "A Level" },
    { kind: "BOARD", value: "Cambridge" },
    { kind: "SYLLABUS_CODE", value: "9709" },
  ]);
}

assert.equal(
  shouldSkipFirstTeachingProfileCreate([
    { status: "ACTIVE", subject: "Mathematics", rate: 2500, online: true, inPerson: false },
  ]),
  true,
);
assert.equal(
  shouldSkipFirstTeachingProfileCreate([
    { status: "ACTIVE", subject: "Mathematics", rate: 2500, online: true, inPerson: false },
    { status: "ACTIVE", subject: "Mathematics", rate: 1800, online: true, inPerson: true },
  ]),
  true,
  "existing duplicate Maths rows are left alone — skip first-profile create",
);
assert.equal(
  shouldSkipFirstTeachingProfileCreate([
    { status: "PAUSED", subject: "Mathematics", rate: 2500, online: true, inPerson: false },
  ]),
  false,
);
assert.equal(shouldSkipFirstTeachingProfileCreate([]), false);

console.log("teaching-profile-write.test.ts: ok");
