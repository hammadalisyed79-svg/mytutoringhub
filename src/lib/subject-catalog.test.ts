import assert from "node:assert/strict";
import {
  catalogSubjectNames,
  mergeSubjectNames,
  parseRemoteSubjectsPayload,
  subjectNamesFromObjectKey,
} from "./subject-catalog";

assert.deepEqual(mergeSubjectNames(["Math"], ["math"], ["Physics"]), ["Math", "Physics"]);

const fromArray = parseRemoteSubjectsPayload(["Mathematics", " Physics ", "Mathematics"]);
assert.deepEqual(fromArray, ["Mathematics", "Physics"]);

const fromObject = parseRemoteSubjectsPayload({
  subjects: [{ name: "Chemistry" }, { name: "Biology" }],
});
assert.deepEqual(fromObject, ["Chemistry", "Biology"]);

assert.throws(() => parseRemoteSubjectsPayload("{not-json"), /not valid JSON/);
assert.throws(() => parseRemoteSubjectsPayload({ foo: 1 }), /must be a JSON array/);

const fromKey = subjectNamesFromObjectKey("cambridge/igcse/chemistry/0620/0620_s24_qp_42.pdf");
assert.ok(fromKey.includes("Chemistry"));
assert.ok(!fromKey.includes("Cambridge"));
assert.ok(!fromKey.includes("Igcse"));

const catalog = catalogSubjectNames();
assert.ok(catalog.includes("Mathematics"));
assert.ok(catalog.includes("IELTS"));
assert.ok(catalog.length >= 40);

console.log("subject-catalog tests passed");
