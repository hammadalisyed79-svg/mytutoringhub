import assert from "node:assert/strict";
import {
  isMissingCapabilitySchemaError,
  listingHasCapability,
  listingMatchesCapabilityFilters,
  listingMatchesCanonicalSubject,
  listingMatchesExpandedSubject,
  teachingProfileCapabilityWhere,
} from "./search-capabilities";

const joinOnlyGcse = {
  subject: "Mathematics",
  title: "Mathematics",
  level: "All levels",
  board: null,
  qualification: null,
  syllabusCode: null,
  capabilities: [
    { kind: "LEVEL", value: "GCSE" },
    { kind: "BOARD", value: "AQA" },
    { kind: "SYLLABUS_CODE", value: "8300" },
  ],
};

const scalarALevel = {
  subject: "Mathematics",
  level: "A Level",
  board: "Cambridge",
  qualification: "A Level",
  syllabusCode: "9709",
  capabilities: [],
};

const emptyListing = {
  subject: "Mathematics",
  level: "All levels",
  board: null,
  qualification: null,
  syllabusCode: null,
  capabilities: [],
};

{
  assert.equal(listingHasCapability(joinOnlyGcse, "LEVEL", "GCSE"), true);
  assert.equal(listingHasCapability(joinOnlyGcse, "BOARD", "AQA"), true);
  assert.equal(listingHasCapability(joinOnlyGcse, "SYLLABUS_CODE", "8300"), true);
  assert.equal(listingHasCapability(joinOnlyGcse, "LEVEL", "A Level"), false);
}

{
  assert.equal(listingHasCapability(scalarALevel, "LEVEL", "A Level"), true);
  assert.equal(listingHasCapability(scalarALevel, "BOARD", "Cambridge"), true);
  assert.equal(listingHasCapability(scalarALevel, "SYLLABUS_CODE", "9709"), true);
  assert.equal(listingHasCapability(scalarALevel, "LEVEL", "GCSE"), false);
}

{
  assert.equal(listingMatchesCapabilityFilters(joinOnlyGcse, { level: "GCSE", board: "AQA" }), true);
  assert.equal(listingMatchesCapabilityFilters(joinOnlyGcse, { level: "A Level" }), false);
  assert.equal(listingMatchesCapabilityFilters(scalarALevel, { syllabusCode: "9709", board: "Cambridge" }), true);
  assert.equal(listingMatchesCapabilityFilters(emptyListing, { level: "GCSE" }), false);
}

{
  assert.equal(listingMatchesCanonicalSubject({ subject: "O Level Maths" }, "Mathematics"), true);
  assert.equal(listingMatchesCanonicalSubject({ subject: "Physics" }, "Mathematics"), false);
}

// Subject search must stay listing-scoped (Madhu / Biology regression)
{
  const biology = { subject: "Biology", canonicalSubject: "Biology", title: "Madhu · Biology" };
  const maths = { subject: "O Level Maths", canonicalSubject: "Mathematics", title: "Madhu · O Level Maths" };
  const neet = { subject: "NEET Prep", canonicalSubject: "NEET Prep", title: "Madhu · NEET Prep" };
  const psle = {
    subject: "PSLE Maths",
    canonicalSubject: "PSLE Maths",
    title: "Experienced tutor teaching Maths, Science, Biology, Chemistry",
  };
  assert.equal(listingMatchesExpandedSubject(biology, "Biology"), true);
  assert.equal(listingMatchesExpandedSubject(maths, "Biology"), false);
  assert.equal(listingMatchesExpandedSubject(neet, "Biology"), false);
  assert.equal(listingMatchesExpandedSubject(psle, "Biology"), false);
  assert.equal(listingMatchesExpandedSubject(maths, "Mathematics"), true);
  assert.equal(listingMatchesExpandedSubject({ subject: "Commerce" }, "Business"), true);
  assert.equal(listingMatchesExpandedSubject({ subject: "Business Studies" }, "Business"), true);
}

{
  const withJoin = teachingProfileCapabilityWhere({
    board: "AQA",
    level: "GCSE",
    syllabusCode: "8300",
    includeJoinTable: true,
  });
  assert.equal(withJoin.length, 3);
  assert.ok(JSON.stringify(withJoin).includes("capabilities"));

  const scalarsOnly = teachingProfileCapabilityWhere({
    board: "AQA",
    level: "GCSE",
    includeJoinTable: false,
  });
  assert.equal(scalarsOnly.length, 2);
  assert.equal(JSON.stringify(scalarsOnly).includes("capabilities"), false);
  assert.equal(JSON.stringify(scalarsOnly).includes("tutorProfile"), false);
}

{
  assert.equal(
    isMissingCapabilitySchemaError(
      new Error("Unknown field `capabilities` for select statement on model `SubjectProfile`."),
    ),
    true,
  );
  assert.equal(isMissingCapabilitySchemaError(new Error("connection refused")), false);
}

console.log("search-capabilities.test.ts: ok");
