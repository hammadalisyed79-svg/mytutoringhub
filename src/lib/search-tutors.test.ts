import assert from "node:assert/strict";
import { publicListedTutorWhere } from "@/lib/tutor-public-eligibility";
import { similarTutorsWhereClause } from "@/lib/search-tutors";

const publicWhere = publicListedTutorWhere();

{
  const where = similarTutorsWhereClause({
    id: "listing-a",
    subjects: "Mathematics, Physics",
    location: "Lahore, Pakistan",
  });
  assert.ok(where);
  assert.deepEqual(where!.tutorProfile, publicWhere);
  assert.deepEqual(where!.id, { not: "listing-a" });
  assert.equal(where!.status, "ACTIVE");
  assert.equal(where!.OR.length, 2);
}

{
  const where = similarTutorsWhereClause({
    excludeTutorProfileId: "tutor-a",
    subjects: "Mathematics",
    location: "Lahore",
  });
  assert.ok(where);
  assert.deepEqual(where!.tutorProfileId, { not: "tutor-a" });
}

{
  const where = similarTutorsWhereClause({
    id: "hidden-tutor",
    subjects: "",
    location: "",
  });
  assert.equal(where, null);
}

console.log("search-tutors.test.ts: ok");
