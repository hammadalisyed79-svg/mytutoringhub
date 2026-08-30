import assert from "node:assert/strict";
import {
  capabilitiesFromListingInput,
  capabilitiesFromMultiValue,
} from "@/lib/teaching-profile-capabilities";
import {
  derivedMasterSubjectsCsv,
  shouldSkipFirstTeachingProfileCreate,
  teachingProfilePersistFields,
} from "@/lib/teaching-profile-write";
import { shouldRejectActiveCanonicalWrite } from "@/lib/teaching-profile-duplicates";

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

assert.throws(
  () =>
    teachingProfilePersistFields({
      subject: "General tutoring",
      rate: 2000,
      description: "Weekly lessons for any school subject.",
      online: true,
      inPerson: false,
    }),
  /specific subject/i,
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

{
  const fields = teachingProfilePersistFields({
    subject: "Maths",
    rate: 2000,
    description: "GCSE Mathematics",
    online: true,
    inPerson: false,
  });
  const clash = shouldRejectActiveCanonicalWrite({
    existing: [{ id: "existing-maths", status: "ACTIVE", subject: "Mathematics" }],
    nextStatus: "ACTIVE",
    nextSubject: fields.subject,
  });
  assert.ok(clash, "wizard/listing create must reject second ACTIVE Maths/Mathematics");
  assert.equal(clash.canonical, "Mathematics");
}

{
  const pausedOk = shouldRejectActiveCanonicalWrite({
    existing: [{ id: "existing-maths", status: "ACTIVE", subject: "Mathematics" }],
    nextStatus: "PAUSED",
    nextSubject: "Maths",
  });
  assert.equal(pausedOk, null, "PAUSED duplicate of Mathematics is allowed");
}

{
  const csv = derivedMasterSubjectsCsv([
    { status: "ACTIVE", subject: "Maths" },
    { status: "ACTIVE", subject: "Mathematics" },
    { status: "PAUSED", subject: "Physics" },
    { status: "ACTIVE", subject: "Chemistry" },
    { status: "ACTIVE", subject: "General tutoring" },
  ]);
  assert.equal(csv, "Mathematics, Chemistry");
}

console.log("teaching-profile-write.test.ts: ok");
