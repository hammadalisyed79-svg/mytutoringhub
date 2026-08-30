import assert from "node:assert/strict";
import {
  CONSOLIDATION_EXECUTE,
  dryRunConsolidateGroup,
  leftoverCsvTagsNotExploded,
  mergedVisibilityWindows,
  selectSurvivor,
  unionCapabilities,
} from "./teaching-profile-consolidation";
import { groupByCanonicalSubject } from "./teaching-profile-duplicates";

const now = new Date("2026-08-30T12:00:00.000Z");

const older = {
  id: "old-maths",
  tutorProfileId: "t1",
  status: "ACTIVE",
  subject: "Mathematics",
  canonicalSubject: "Mathematics",
  title: "Mathematics tutor",
  level: "GCSE",
  board: null as string | null,
  qualification: null as string | null,
  syllabusCode: null as string | null,
  rate: 2000,
  boostUntil: null as Date | null,
  highlightedUntil: null as Date | null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const boosted = {
  ...older,
  id: "boosted-maths",
  subject: "Maths",
  canonicalSubject: "Maths",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  boostUntil: new Date("2026-09-15T00:00:00.000Z"),
  rate: 2500,
};

const complete = {
  ...older,
  id: "complete-maths",
  subject: "O Level Maths",
  canonicalSubject: "O Level Maths",
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  level: "O Level",
  board: "Cambridge",
  syllabusCode: "4024",
  rate: 1800,
};

assert.equal(CONSOLIDATION_EXECUTE, false, "dry-run must never flip execute to true");

{
  const pick = selectSurvivor([older, boosted], now);
  assert.equal(pick.survivor.id, "boosted-maths", "live Boost beats oldest URL");
  assert.ok(pick.reasons.some((r) => /boost/i.test(r)));
}

{
  const pick = selectSurvivor([older, complete], now);
  assert.equal(pick.survivor.id, "complete-maths", "more complete capabilities beat a bare oldest row");
}

{
  const bareNewer = {
    ...older,
    id: "newer-bare",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
  };
  const pick = selectSurvivor([bareNewer, older], now);
  assert.equal(pick.survivor.id, "old-maths", "oldest public URL when Boost/capabilities tie");
}

{
  const groups = groupByCanonicalSubject([older, boosted, complete]);
  assert.equal(groups.length, 1);
  const dry = dryRunConsolidateGroup(groups[0]!, now);
  assert.equal(dry.execute, false);
  assert.equal(dry.canonical, "Mathematics");
  assert.equal(dry.survivorId, "boosted-maths");
  assert.deepEqual(dry.redirectIds.sort(), ["complete-maths", "old-maths"]);
  assert.equal(dry.rateConflict, true);
  assert.ok(dry.capabilityUnion.some((c) => c.kind === "LEVEL" && c.value === "GCSE"));
  assert.ok(dry.capabilityUnion.some((c) => c.kind === "SYLLABUS_CODE" && c.value === "4024"));
  assert.ok(dry.wouldBackfillCanonicalSubject.some((row) => row.id === "boosted-maths" && row.to === "Mathematics"));
  assert.ok(!("DELETE" in dry));
}

{
  const union = unionCapabilities([older, complete]);
  assert.ok(union.some((c) => c.kind === "BOARD" && c.value === "Cambridge"));
}

{
  const leftover = leftoverCsvTagsNotExploded("Mathematics, Physics, O Level Maths", [
    { subject: "Mathematics" },
  ]);
  assert.deepEqual(
    leftover.map((row) => row.canonical),
    ["Physics"],
    "Maths alias is already covered; do not explode O Level Maths into another profile",
  );
  assert.ok(leftover.every((row) => row.alreadyHasTeachingProfile === false));
}

{
  const leftover = leftoverCsvTagsNotExploded("Chemistry", [{ subject: "Chemistry" }]);
  assert.equal(leftover.length, 0);
}

{
  const windows = mergedVisibilityWindows(
    [
      { ...older, boostUntil: new Date("2026-09-01T00:00:00.000Z") },
      { ...boosted, boostUntil: new Date("2026-10-01T00:00:00.000Z") },
    ],
    now,
  );
  assert.equal(windows.boostUntil?.toISOString(), "2026-10-01T00:00:00.000Z");
}

console.log("teaching-profile-consolidation.test.ts: ok");
