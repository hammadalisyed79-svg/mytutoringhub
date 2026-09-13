import assert from "node:assert/strict";
import { publicListedTutorWhere } from "@/lib/tutor-public-eligibility";
import { similarTutorsWhereClause } from "@/lib/search-tutors";
import { listingMatchesExpandedSubject } from "@/lib/search-capabilities";
import { resolveSubjectName, relatedSubjects, scoreSuggestion } from "@/lib/search-smart";
import { sameCanonicalSubject } from "@/lib/teaching-profile-subject";

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
  assert.ok(Array.isArray(where!.OR));
  assert.ok(where!.OR!.length >= 2);
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

// Science must not match Computer Science
{
  assert.equal(sameCanonicalSubject("Science", "Computer Science"), false);
  assert.equal(
    listingMatchesExpandedSubject({ subject: "Computer Science", canonicalSubject: "Computer Science" }, "Science"),
    false,
  );
  assert.equal(
    listingMatchesExpandedSubject({ subject: "Science", canonicalSubject: "Science" }, "Science"),
    true,
  );
  assert.equal(
    listingMatchesExpandedSubject({ subject: "A Level Science", canonicalSubject: "Science" }, "Science"),
    true,
  );
  assert.ok(scoreSuggestion("Science", "Computer Science") < 70);
  assert.equal(resolveSubjectName("Science", ["Science", "Computer Science", "Biology"]).value, "Science");
  assert.ok(!relatedSubjects("Science", ["Science", "Computer Science", "Biology"]).includes("Computer Science"));
}

{
  const where = similarTutorsWhereClause({
    id: "listing-a",
    subjects: "Science",
    location: "Lahore, Pakistan",
  });
  assert.ok(where);
  const orJson = JSON.stringify(where!.OR);
  assert.match(orJson, /"Science"/);
  assert.doesNotMatch(orJson, /Computer Science/);
  assert.ok(where!.location);
}

{
  const generic = similarTutorsWhereClause({
    id: "listing-a",
    subjects: "Science",
    location: "Lahore",
    locationOnly: true,
  });
  assert.ok(generic);
  assert.equal(generic!.OR, undefined);
  assert.deepEqual(generic!.location, { contains: "Lahore", mode: "insensitive" });
}

console.log("search-tutors.test.ts: ok");
