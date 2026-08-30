import assert from "node:assert/strict";
import {
  capabilitiesFromScalarRow,
  capabilitiesFromListingInput,
  capabilityGroupKey,
  displayScalarsFromCapabilities,
  isCapabilityKind,
  joinCapabilityLabels,
  normalizeCapabilityValue,
} from "./teaching-profile-capabilities";

assert.equal(isCapabilityKind("LEVEL"), true);
assert.equal(isCapabilityKind("TOPIC"), false);

assert.equal(normalizeCapabilityValue("  5070  ", "SYLLABUS_CODE"), "5070");
assert.equal(normalizeCapabilityValue(" cambridge  international ", "BOARD"), "cambridge international");
assert.equal(capabilityGroupKey("Cambridge", "BOARD"), "cambridge");
assert.equal(capabilityGroupKey("0580", "SYLLABUS_CODE"), "0580");

assert.deepEqual(
  capabilitiesFromScalarRow({
    level: "All levels",
    board: " Cambridge ",
    qualification: "",
    syllabusCode: "0580",
  }),
  [
    { kind: "BOARD", value: "Cambridge" },
    { kind: "SYLLABUS_CODE", value: "0580" },
  ],
);

assert.deepEqual(
  capabilitiesFromScalarRow({
    level: "GCSE",
    board: null,
    qualification: "GCSE",
    syllabusCode: null,
  }),
  [
    { kind: "LEVEL", value: "GCSE" },
    { kind: "QUALIFICATION", value: "GCSE" },
  ],
);

assert.deepEqual(
  capabilitiesFromScalarRow({
    level: "Primary, Matric / SSC, O Level",
    board: "Cambridge, Edexcel",
    qualification: null,
    syllabusCode: "0580, 0606",
  }),
  [
    { kind: "LEVEL", value: "Primary" },
    { kind: "LEVEL", value: "Matric / SSC" },
    { kind: "LEVEL", value: "O Level" },
    { kind: "BOARD", value: "Cambridge" },
    { kind: "BOARD", value: "Edexcel" },
    { kind: "SYLLABUS_CODE", value: "0580" },
    { kind: "SYLLABUS_CODE", value: "0606" },
  ],
);

const scalars = displayScalarsFromCapabilities([
  { kind: "LEVEL", value: "GCSE" },
  { kind: "LEVEL", value: "A Level" },
  { kind: "BOARD", value: "Cambridge" },
  { kind: "BOARD", value: "Edexcel" },
  { kind: "SYLLABUS_CODE", value: "0580" },
]);
assert.equal(scalars.level, "GCSE");
assert.equal(scalars.board, "Cambridge");
assert.equal(scalars.qualification, null);
assert.equal(scalars.syllabusCode, "0580");

assert.deepEqual(
  capabilitiesFromListingInput({
    levels: ["GCSE", "A Level"],
    boards: ["Cambridge"],
    level: "ignored",
  }).map((row) => `${row.kind}:${row.value}`),
  ["LEVEL:GCSE", "LEVEL:A Level", "BOARD:Cambridge"],
);

assert.deepEqual(
  capabilitiesFromListingInput({
    level: "A Level",
    board: "Edexcel",
    syllabusCode: "9709",
  }),
  [
    { kind: "LEVEL", value: "A Level" },
    { kind: "BOARD", value: "Edexcel" },
    { kind: "SYLLABUS_CODE", value: "9709" },
  ],
);

assert.equal(displayScalarsFromCapabilities([]).level, "All levels");
assert.equal(joinCapabilityLabels(["GCSE", "A Level"]), "GCSE · A Level");

console.log("teaching-profile-capabilities.test.ts: ok");
