import assert from "node:assert/strict";
import { curriculumCodesForCapabilities, curriculumCodesForSubject } from "./curriculum";

const businessAll = curriculumCodesForSubject("Business");
assert.ok(businessAll.length > 5, "Business should have multiple syllabus codes");

const cambridgeOnly = curriculumCodesForCapabilities("Business", ["Cambridge"], []);
assert.ok(cambridgeOnly.length > 0);
assert.ok(cambridgeOnly.length < businessAll.length, "board filter should narrow codes");
assert.ok(cambridgeOnly.every((row) => /cambridge/i.test(row.board)));

const emptyFilterFallsBack = curriculumCodesForCapabilities("Business", ["Not A Real Board"], []);
assert.equal(emptyFilterFallsBack.length, businessAll.length);

console.log("curriculum-codes.test.ts: ok");
