import assert from "node:assert/strict";
import { isNearDuplicateListing, scoreListingQuality } from "./listing-quality";

const weak = scoreListingQuality({
  subject: "General",
  title: "Tutor",
  description: "New tutor — update your profile in the dashboard.",
  level: "All levels",
  rate: 5000,
  online: true,
});
assert.equal(weak.band, "Needs improvement");
assert.ok(weak.tips.length > 0);

const strong = scoreListingQuality({
  subject: "Chemistry",
  title: "Cambridge O Level Chemistry 5070",
  headline: "Exam-focused Chemistry for O Level students",
  description:
    "I teach Cambridge O Level Chemistry (5070) with past-paper practice, practical tips, and weekly homework feedback for serious exam candidates.",
  level: "O Level",
  board: "Cambridge O Level",
  qualification: "O Level",
  syllabusCode: "5070",
  location: "Online",
  rate: 2500,
  online: true,
});
assert.equal(strong.band, "Strong");
assert.ok(strong.score >= 75);

const dup = isNearDuplicateListing(
  { subject: "Mathematics", level: "GCSE", board: "AQA", title: "Maths GCSE" },
  { subject: "Mathematics", level: "GCSE", board: "AQA", title: "Maths GCSE" },
);
assert.equal(dup.nearDup, true);
assert.equal(dup.confidence, "high");

const okLevels = isNearDuplicateListing(
  { subject: "Mathematics", level: "GCSE", board: "AQA" },
  { subject: "Mathematics", level: "A Level", board: "AQA" },
);
assert.equal(okLevels.nearDup, false);

console.log("listing-quality tests passed");
