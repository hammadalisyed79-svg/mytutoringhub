import assert from "node:assert/strict";
import {
  ActiveCanonicalSubjectConflictError,
  activeCanonicalCollisionGroups,
  canApplyActiveCanonicalUniqueIndex,
  findActiveCanonicalClash,
  formatTeachingProfileDuplicateMessage,
  groupByCanonicalSubject,
  shouldRejectActiveCanonicalWrite,
  tutorCanonicalDuplicateNotice,
} from "./teaching-profile-duplicates";

const mathsA = {
  id: "listing-maths",
  tutorProfileId: "tutor-1",
  status: "ACTIVE",
  subject: "Mathematics",
  canonicalSubject: "Mathematics",
};
const mathsPaused = {
  id: "listing-maths-paused",
  tutorProfileId: "tutor-1",
  status: "PAUSED",
  subject: "Maths",
  canonicalSubject: "Maths",
};
const physicsA = {
  id: "listing-physics",
  tutorProfileId: "tutor-1",
  status: "ACTIVE",
  subject: "Physics",
  canonicalSubject: "Physics",
};

{
  const clash = findActiveCanonicalClash([mathsA], "Maths");
  assert.ok(clash, "Maths and Mathematics are the same canonical subject");
  assert.equal(clash.canonical, "Mathematics");
  assert.equal(clash.listing.id, "listing-maths");
}

{
  const clash = findActiveCanonicalClash([mathsA], "GCSE Maths");
  assert.ok(clash, "exam-family Maths still collides with Mathematics");
}

{
  const clash = findActiveCanonicalClash([mathsA], "Physics");
  assert.equal(clash, null);
}

{
  const clash = findActiveCanonicalClash([mathsPaused], "Mathematics");
  assert.equal(clash, null, "PAUSED duplicate is not an ACTIVE uniqueness clash");
}

{
  const createSecond = shouldRejectActiveCanonicalWrite({
    existing: [mathsA],
    nextStatus: "ACTIVE",
    nextSubject: "Maths",
  });
  assert.ok(createSecond, "block creating a second ACTIVE same canonical subject");
  assert.equal(createSecond.canonical, "Mathematics");
}

{
  const createPaused = shouldRejectActiveCanonicalWrite({
    existing: [mathsA],
    nextStatus: "PAUSED",
    nextSubject: "Maths",
  });
  assert.equal(createPaused, null, "allow PAUSED duplicate of an ACTIVE Mathematics profile");
}

{
  const createActiveBesidePaused = shouldRejectActiveCanonicalWrite({
    existing: [mathsPaused],
    nextStatus: "ACTIVE",
    nextSubject: "Mathematics",
  });
  assert.equal(
    createActiveBesidePaused,
    null,
    "ACTIVE + PAUSED of the same canonical subject is allowed (migration)",
  );
}

{
  const activatePausedWhileActiveExists = shouldRejectActiveCanonicalWrite({
    existing: [mathsA, mathsPaused],
    excludeId: mathsPaused.id,
    nextStatus: "ACTIVE",
    nextSubject: mathsPaused.subject,
    previousStatus: "PAUSED",
    previousSubject: mathsPaused.subject,
  });
  assert.ok(activatePausedWhileActiveExists, "do not activate a second ACTIVE Mathematics profile");
}

{
  const updateExistingCollision = shouldRejectActiveCanonicalWrite({
    existing: [
      mathsA,
      { ...mathsA, id: "listing-maths-2", subject: "O Level Maths", canonicalSubject: "O Level Maths" },
    ],
    excludeId: "listing-maths-2",
    nextStatus: "ACTIVE",
    nextSubject: "O Level Maths",
    previousStatus: "ACTIVE",
    previousSubject: "O Level Maths",
  });
  assert.equal(
    updateExistingCollision,
    null,
    "existing duplicate ACTIVE rows may be edited in place (no auto-merge)",
  );
}

{
  const renameToClash = shouldRejectActiveCanonicalWrite({
    existing: [mathsA, physicsA],
    excludeId: physicsA.id,
    nextStatus: "ACTIVE",
    nextSubject: "Maths",
    previousStatus: "ACTIVE",
    previousSubject: "Physics",
  });
  assert.ok(renameToClash, "cannot retitle Physics to Maths while Mathematics is already ACTIVE");
}

{
  const err = new ActiveCanonicalSubjectConflictError("Mathematics", "listing-maths");
  assert.equal(err.code, "active_canonical_subject_exists");
  assert.match(err.message, /Teaching Profile/);
  assert.match(err.message, /Mathematics/);
}

{
  const groups = groupByCanonicalSubject([
    mathsA,
    { ...mathsA, id: "b", subject: "IGCSE Maths" },
    physicsA,
  ]);
  assert.equal(groups.length, 2);
  const collisions = activeCanonicalCollisionGroups(groups);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0]?.canonical, "Mathematics");
  assert.equal(canApplyActiveCanonicalUniqueIndex(groups), false);
}

{
  const notice = tutorCanonicalDuplicateNotice([
    mathsA,
    { ...mathsA, id: "b", subject: "CBSE Maths" },
  ]);
  assert.ok(notice);
  assert.equal(
    notice.message,
    "You have more than one Mathematics Teaching Profile — consolidate later",
  );
}

assert.equal(
  formatTeachingProfileDuplicateMessage(["Mathematics", "Physics"]),
  "You have more than one Teaching Profile for Mathematics and Physics — consolidate later",
);

{
  const onlyPausedDup = tutorCanonicalDuplicateNotice([
    mathsPaused,
    { ...mathsPaused, id: "paused-2", subject: "Islamiyat" },
  ]);
  // different canonical keys — no notice
  assert.equal(onlyPausedDup, null);
}

{
  const pausedPair = tutorCanonicalDuplicateNotice([
    mathsPaused,
    { ...mathsPaused, id: "paused-2", subject: "Mathematics" },
  ]);
  assert.ok(pausedPair, "tutor-facing notice includes same-canonical groups even when PAUSED");
}

console.log("teaching-profile-duplicates.test.ts: ok");
