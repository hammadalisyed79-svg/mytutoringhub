import assert from "node:assert/strict";
import { parseCambridgeFilename } from "./cambridge-filename-parser";
import { parseHttpsPdfUrl } from "./allowlist";
import { isSafeCatalogKey } from "./catalog-key";
import { matchCurriculumEntry } from "./subject-matcher";
import { validatePdfBuffer, sha256 } from "./file-validate";
import { duplicateComboWhere } from "./catalog-key";

function expectParsed(
  filename: string,
  expected: { code: string; session: string; year: number; type: string; component: string },
) {
  const result = parseCambridgeFilename(filename);
  assert.equal(result.ok, true, `${filename} should parse`);
  if (!result.ok) return;
  assert.equal(result.metadata.syllabusCode, expected.code);
  assert.equal(result.metadata.sessionLabel, expected.session);
  assert.equal(result.metadata.year, expected.year);
  assert.equal(result.metadata.documentType, expected.type);
  assert.equal(result.metadata.componentCode, expected.component);
}

expectParsed("0620_s24_qp_42.pdf", {
  code: "0620",
  session: "May/Jun",
  year: 2024,
  type: "QUESTION_PAPER",
  component: "42",
});
expectParsed("0620_s24_ms_42.pdf", {
  code: "0620",
  session: "May/Jun",
  year: 2024,
  type: "MARK_SCHEME",
  component: "42",
});
expectParsed("0620_w23_qp_41.pdf", {
  code: "0620",
  session: "Oct/Nov",
  year: 2023,
  type: "QUESTION_PAPER",
  component: "41",
});
expectParsed("0620_m25_ms_22.pdf", {
  code: "0620",
  session: "Feb/Mar",
  year: 2025,
  type: "MARK_SCHEME",
  component: "22",
});

const review = parseCambridgeFilename("chemistry-notes.pdf");
assert.equal(review.ok, false);
if (!review.ok) assert.equal(review.status, "REQUIRES_REVIEW");

const chem = matchCurriculumEntry("0620", { board: "Cambridge IGCSE", qualification: "IGCSE" });
assert.ok(chem, "0620 should match a curriculum Chemistry row");
assert.equal(chem?.subject, "Chemistry");
assert.match(chem?.board || "", /Cambridge/i);

const unknown = matchCurriculumEntry("9999", {});
assert.equal(unknown, null, "unknown syllabus should be unmatched");

const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("1 0 obj\n<<>>\nendobj\n")]);
const valid = validatePdfBuffer(pdf, "0620_s24_qp_42.pdf", "application/pdf");
assert.equal(valid.ok, true);
if (valid.ok) {
  assert.equal(valid.checksum, sha256(pdf));
  assert.equal(valid.mimeType, "application/pdf");
}

const html = validatePdfBuffer(Buffer.from("<!DOCTYPE html><html></html>"), "paper.pdf", "text/html");
assert.equal(html.ok, false);

const exe = validatePdfBuffer(pdf, "paper.exe", "application/pdf");
assert.equal(exe.ok, false);

const combo = duplicateComboWhere({
  curriculumCode: "CIGC-IGCSE-CHEM",
  year: 2024,
  session: "May/Jun",
  componentCode: "42",
  documentType: "QUESTION_PAPER",
});
assert.ok(combo);
assert.equal(combo?.year, 2024);

assert.equal(isSafeCatalogKey("cambridge-igcse__chemistry__2024__question-paper__may-june__42"), true);
assert.equal(isSafeCatalogKey("../etc/passwd"), false);
assert.equal(isSafeCatalogKey("a"), false);

const blocked = parseHttpsPdfUrl("https://www.savemyexams.com/0620_s24_qp_42.pdf");
assert.equal(blocked.ok, false);

const badScheme = parseHttpsPdfUrl("http://example.com/file.pdf");
assert.equal(badScheme.ok, false);

console.log("past-papers tests passed");
