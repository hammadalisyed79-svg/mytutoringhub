import assert from "node:assert/strict";
import {
  encodeSubjectProfileNote,
  parseSubjectProfileIdFromNotes,
} from "@/lib/listing-checkout";

assert.equal(encodeSubjectProfileNote("clxyz123"), "subjectProfileId=clxyz123");
assert.equal(parseSubjectProfileIdFromNotes("subjectProfileId=clxyz123"), "clxyz123");
assert.equal(
  parseSubjectProfileIdFromNotes(JSON.stringify({ subjectProfileId: "abc" })),
  "abc",
);
assert.equal(parseSubjectProfileIdFromNotes(null), null);
assert.equal(parseSubjectProfileIdFromNotes("admin note only"), null);

console.log("listing-checkout.test.ts: ok");
