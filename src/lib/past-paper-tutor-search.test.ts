import assert from "node:assert/strict";
import { pastPaperTutorSearchHref, pastPaperTutorSearchParams } from "./past-paper-tutor-search";

{
  const params = pastPaperTutorSearchParams({
    subject: "Mathematics",
    board: "Cambridge",
    level: "A Level",
    syllabusCode: "9709",
  });
  assert.equal(params.get("subject"), "Mathematics");
  assert.equal(params.get("board"), "Cambridge");
  assert.equal(params.get("level"), "A Level");
  assert.equal(params.get("syllabusCode"), "9709");
  assert.equal(params.get("q"), null, "syllabus code must not be stuffed into q");
}

{
  const href = pastPaperTutorSearchHref({
    subject: "Physics",
    board: "Edexcel",
    level: "GCSE",
    syllabusCode: "1PH0",
  });
  assert.match(href, /^\/search\?/);
  assert.match(href, /subject=Physics/);
  assert.match(href, /board=Edexcel/);
  assert.match(href, /syllabusCode=1PH0/);
}

console.log("past-paper-tutor-search.test.ts: ok");
