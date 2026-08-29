import assert from "node:assert/strict";
import {
  classifyPastPaperQuality,
  normalizePastPaperSession,
  summarizeQualityClasses,
} from "./quality-normalize";

assert.equal(normalizePastPaperSession("june").canonical, "June");
assert.equal(normalizePastPaperSession("june").confidence, "high");
assert.deepEqual(normalizePastPaperSession("may-june"), {
  canonical: "May/Jun",
  confidence: "high",
  reason: "explicit_map",
});
assert.deepEqual(normalizePastPaperSession("May/Jun"), {
  canonical: "May/Jun",
  confidence: "high",
  reason: "already_canonical",
});
assert.equal(normalizePastPaperSession("january").canonical, "January");
assert.equal(normalizePastPaperSession("").confidence, "none");
assert.equal(normalizePastPaperSession("weird-session").confidence, "none");

const auto = classifyPastPaperQuality({
  session: "oct-nov",
  paperType: "Question paper",
  documentType: "QUESTION_PAPER",
  storageKey: "x.pdf",
  subject: "Mathematics",
  board: "CAPS",
  syllabusCode: "MATH",
  year: 2024,
});
assert.equal(auto.class, "AUTO_FIXABLE");
assert.equal(auto.sessionCanonical, "Oct/Nov");

const clean = classifyPastPaperQuality({
  session: "May/Jun",
  paperType: "Question paper",
  documentType: "QUESTION_PAPER",
  storageKey: "x.pdf",
  subject: "Chemistry",
  board: "Cambridge IGCSE",
  syllabusCode: "0620",
  year: 2024,
});
assert.equal(clean.class, "CLEAN");

const broken = classifyPastPaperQuality({
  session: "May/Jun",
  subject: "Chemistry",
  board: "Cambridge IGCSE",
  year: 2024,
});
assert.equal(broken.class, "BROKEN");

const summary = summarizeQualityClasses([
  {
    session: "june",
    paperType: "Question paper",
    documentType: "QUESTION_PAPER",
    storageKey: "a",
    subject: "Maths",
    board: "AQA",
    year: 2023,
  },
  {
    session: "May/Jun",
    paperType: "Question paper",
    documentType: "QUESTION_PAPER",
    storageKey: "b",
    subject: "Maths",
    board: "Cambridge IGCSE",
    syllabusCode: "0580",
    year: 2023,
  },
]);
assert.equal(summary.autoFixable, 1);
assert.equal(summary.clean, 1);

console.log("past-paper quality-normalize tests passed");
