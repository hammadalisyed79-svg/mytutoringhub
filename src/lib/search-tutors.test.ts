import assert from "node:assert/strict";
import { publicListedTutorWhere } from "@/lib/tutor-public-eligibility";
import { similarTutorsWhereClause } from "@/lib/search-tutors";

const publicWhere = publicListedTutorWhere();

{
  const where = similarTutorsWhereClause({
    id: "tutor-a",
    subjects: "Mathematics, Physics",
    location: "Lahore, Pakistan",
  });
  assert.ok(where);
  assert.equal(where!.active, publicWhere.active);
  assert.deepEqual(where!.user, publicWhere.user);
  assert.deepEqual(where!.id, { not: "tutor-a" });
  assert.equal(where!.OR.length, 2);
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
