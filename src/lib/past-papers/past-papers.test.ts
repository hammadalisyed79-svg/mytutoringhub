import assert from "node:assert/strict";
import { parseCambridgeFilename, normalizeCambridgeSession } from "./cambridge-filename-parser";
import { parseHttpsPdfUrl } from "./allowlist";
import { importedCatalogKey, isSafeCatalogKey } from "./catalog-key";
import { matchCurriculumEntry } from "./subject-matcher";
import { validatePdfBuffer, sha256 } from "./file-validate";
import { duplicateComboWhere } from "./catalog-key";
import { guessSyllabusCode } from "./browse";
import { parseManifestPayload } from "./manifest-import";
import { classifyR2PaperObject, FBISE_R2_PAPERS_PREFIX, r2PaperListPrefixes } from "./past-paper-sync";
import { parseFbiseStoragePath } from "./fbise-path-parser";
import { pastPaperBoardLabel, pastPaperBoardOptions, resolvePastPaperBoard } from "./browse";
import { groupPapersByYearSessionComponent } from "./group-papers";
import { isR2Configured } from "./r2";
import { downloadableFileWhere } from "./availability";
import {
  hasPublicPaperSearchFilters,
  mergePublicPaperFilters,
  normalizeSyllabusCode,
  parsePastPaperQuery,
  publicPaperWhere,
} from "./public-search";
import {
  createGuestDownloadToken,
  guestDownloadUrl,
  isValidGuestEmail,
  normalizeGuestEmail,
} from "./guest-checkout";

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

expectParsed("0620_m16_er.pdf", {
  code: "0620",
  session: "Feb/Mar",
  year: 2016,
  type: "EXAMINER_REPORT",
  component: "",
});
expectParsed("0620_m16_ci_52.pdf", {
  code: "0620",
  session: "Feb/Mar",
  year: 2016,
  type: "OTHER",
  component: "52",
});
const qpVariant = parseCambridgeFilename("0620_s24_qp_42.pdf");
assert.equal(qpVariant.ok, true);
if (qpVariant.ok) assert.equal(qpVariant.metadata.variant, "2");

const nested = parseCambridgeFilename(
  "cambridge/igcse/chemistry/0620/2024/may-june/question-papers/0620_s24_qp_42.pdf",
);
assert.equal(nested.ok, true);

assert.equal(guessSyllabusCode("Chemistry", "IGCSE"), "0620");
assert.equal(guessSyllabusCode("Chemistry", "O Level"), "5070");
assert.equal(guessSyllabusCode("Chemistry", "A Level"), "9701");
assert.equal(guessSyllabusCode("Chemistry"), "0620");

assert.equal(normalizeCambridgeSession("February/March"), "Feb/Mar");
assert.equal(normalizeCambridgeSession("May/June"), "May/Jun");
assert.equal(normalizeCambridgeSession("October/November"), "Oct/Nov");

const key = importedCatalogKey({
  board: "Cambridge IGCSE",
  subject: "Chemistry",
  year: 2024,
  documentType: "QUESTION_PAPER",
  session: "May/Jun",
  componentCode: "42",
});
assert.equal(key, "cambridge-igcse__chemistry__2024__question-paper__may-jun__42");

const manifest = parseManifestPayload({
  files: [
    {
      original_filename: "0620_s24_qp_42.pdf",
      r2_object_key: "cambridge/igcse/chemistry/0620/2024/may-june/question-papers/0620_s24_qp_42.pdf",
      file_size: 1234,
      checksum: "a".repeat(64),
    },
    {
      original_filename: "notes.txt",
      r2_object_key: "cambridge/igcse/chemistry/0620/notes.txt",
    },
  ],
});
assert.equal(manifest.length, 1);
assert.equal(manifest[0].storageKey.includes("0620_s24_qp_42.pdf"), true);
assert.equal(manifest[0].checksum?.length, 64);

const grouped = groupPapersByYearSessionComponent([
  {
    id: "1",
    catalogKey: "a",
    year: 2024,
    session: "May/Jun",
    componentCode: "42",
    documentType: "MARK_SCHEME",
    paperType: "Marking scheme",
  },
  {
    id: "2",
    catalogKey: "b",
    year: 2024,
    session: "May/Jun",
    componentCode: "42",
    documentType: "QUESTION_PAPER",
    paperType: "Question paper",
  },
]);
assert.equal(grouped[0]?.year, 2024);
assert.equal(grouped[0]?.sessions[0]?.components[0]?.papers[0]?.documentType, "QUESTION_PAPER");
assert.equal(grouped[0]?.sessions[0]?.components[0]?.papers[1]?.documentType, "MARK_SCHEME");

assert.equal(typeof isR2Configured(), "boolean");
assert.deepEqual(downloadableFileWhere(), {
  OR: [{ storageKey: { not: null } }, { fileUrl: { not: null } }],
});

const chemR2 = classifyR2PaperObject(
  "cambridge/igcse/chemistry/0620/0620_s24_qp_42.pdf",
  1234,
);
assert.equal(chemR2.ok, true, "0620 R2 object should classify");
if (chemR2.ok) {
  assert.equal(chemR2.paper.subject, "Chemistry");
  assert.equal(chemR2.paper.syllabusCode, "0620");
  assert.equal(chemR2.paper.year, 2024);
  assert.equal(chemR2.paper.documentType, "QUESTION_PAPER");
  assert.equal(chemR2.paper.storageKey, "cambridge/igcse/chemistry/0620/0620_s24_qp_42.pdf");
  assert.match(chemR2.paper.board, /Cambridge/i);
}

const mathR2 = classifyR2PaperObject("cambridge/igcse/mathematics/0580/0580_w22_ms_13.pdf", 88);
assert.equal(mathR2.ok, true, "0580 R2 object should classify");
if (mathR2.ok) {
  assert.equal(mathR2.paper.subject, "Mathematics");
  assert.equal(mathR2.paper.syllabusCode, "0580");
  assert.equal(mathR2.paper.documentType, "MARK_SCHEME");
}

const skippedJson = classifyR2PaperObject("catalog/subjects.json", 20);
assert.equal(skippedJson.ok, false);

const skippedName = classifyR2PaperObject("cambridge/igcse/chemistry/notes.pdf", 20);
assert.equal(skippedName.ok, false);

const unknownSyllabus = classifyR2PaperObject("9999_s24_qp_11.pdf", 20);
assert.equal(unknownSyllabus.ok, false);

assert.equal(r2PaperListPrefixes()[0], "cambridge/");
assert.ok(r2PaperListPrefixes().includes(`${FBISE_R2_PAPERS_PREFIX}`));

const fbisePath =
  "fbise/hssc/chemistry/chemistry/2024/unknown-session/other/Model_Question_Paper_Chemistry_SSC_II_2024.pdf";
const fbiseParsed = parseFbiseStoragePath(fbisePath, 1000);
assert.equal(fbiseParsed.ok, true);
if (fbiseParsed.ok) {
  assert.equal(fbiseParsed.paper.subject, "Chemistry");
  assert.equal(fbiseParsed.paper.board, "FBISE");
  assert.equal(fbiseParsed.paper.qualification, "HSSC");
  assert.equal(fbiseParsed.paper.year, 2024);
  assert.equal(fbiseParsed.paper.country, "Pakistan");
}

const fbiseR2 = classifyR2PaperObject(fbisePath, 1000);
assert.equal(fbiseR2.ok, true, "FBISE R2 object should classify");
if (fbiseR2.ok) {
  assert.equal(fbiseR2.paper.board, "FBISE");
  assert.equal(fbiseR2.paper.subject, "Chemistry");
}

assert.equal(pastPaperBoardLabel("Pakistani"), "Pakistani curriculum (UAE schools)");
assert.equal(resolvePastPaperBoard("", "FBISE"), "FBISE");
assert.equal(resolvePastPaperBoard("Pakistan", "FBISE"), "FBISE");
const pkBoards = pastPaperBoardOptions({ country: "Pakistan", boardCounts: new Map([["FBISE", 93]]) });
assert.ok(pkBoards.some((row) => row.value === "FBISE"));
assert.ok(!pkBoards.some((row) => row.value === "Pakistani"), "Pakistani hidden outside UAE context");

assert.equal(normalizeSyllabusCode("620"), "0620");
assert.equal(normalizeSyllabusCode("0620"), "0620");
assert.deepEqual(parsePastPaperQuery("0620"), { code: "0620" });
assert.deepEqual(parsePastPaperQuery("9701 qp 42"), { code: "9701", paper: "42" });
assert.deepEqual(parsePastPaperQuery("chem"), { q: "chem" });
assert.deepEqual(
  mergePublicPaperFilters({ q: "0620", code: "", paper: "" }, parsePastPaperQuery("0620")),
  { q: undefined, code: "0620", paper: undefined },
);
assert.equal(
  hasPublicPaperSearchFilters({ code: "0620" }),
  true,
  "code-only search should show results",
);
assert.equal(
  hasPublicPaperSearchFilters({ documentType: "QUESTION_PAPER" }),
  true,
  "document type filter should show results",
);
const codeWhere = publicPaperWhere({ code: "620" });
assert.ok(Array.isArray(codeWhere.AND), "code filter builds where clause");

assert.equal(createGuestDownloadToken().length, 64);
assert.match(guestDownloadUrl("cambridge-0620", "abc123"), /token=abc123/);
assert.equal(isValidGuestEmail("bad"), false);
assert.equal(isValidGuestEmail("user@example.com"), true);
assert.equal(normalizeGuestEmail("  User@Example.COM "), "user@example.com");

console.log("past-papers tests passed");
