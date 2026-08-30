import assert from "node:assert/strict";
import {
  attachAlsoTeaches,
  BROAD_SEARCH_MAX_CARDS_PER_TUTOR,
  dedupeSearchByTutor,
  isSpecificTeachingProfileSearch,
  isSubjectFilteredSearch,
  maxCardsPerTutorForSearch,
  SUBJECT_SEARCH_MAX_CARDS_PER_TUTOR,
  paginateWithTutorCap,
  tutorHasMoreThanCap,
} from "./search-dedupe";

{
  assert.equal(isSpecificTeachingProfileSearch({ subject: "Physics" }), true);
  assert.equal(isSpecificTeachingProfileSearch({ board: "AQA" }), true);
  assert.equal(isSpecificTeachingProfileSearch({ level: "GCSE" }), true);
  assert.equal(isSpecificTeachingProfileSearch({ syllabusCode: "9709" }), true);
  assert.equal(isSpecificTeachingProfileSearch({ subject: "  " }), false);
  assert.equal(isSpecificTeachingProfileSearch({}), false);
  assert.equal(isSubjectFilteredSearch({ subject: "Mathematics" }), true);
  assert.equal(isSubjectFilteredSearch({ subject: "  " }), false);
  assert.equal(maxCardsPerTutorForSearch({ subject: "Mathematics" }), SUBJECT_SEARCH_MAX_CARDS_PER_TUTOR);
  assert.equal(maxCardsPerTutorForSearch({ board: "AQA" }), Number.POSITIVE_INFINITY);
  assert.equal(maxCardsPerTutorForSearch({}), BROAD_SEARCH_MAX_CARDS_PER_TUTOR);
}

function listing(
  tutorProfileId: string,
  listingId: string,
  subject: string,
  score: number,
) {
  return {
    tutorProfileId,
    listingId,
    subject,
    title: subject,
    level: "",
    score,
  };
}

{
  const scored = [
    listing("t1", "maths", "Mathematics", 50),
    listing("t1", "physics", "Physics", 40),
    listing("t1", "chem", "Chemistry", 30),
    listing("t2", "eng", "English", 20),
  ];
  assert.equal(tutorHasMoreThanCap(scored, BROAD_SEARCH_MAX_CARDS_PER_TUTOR), true);
  const page1 = paginateWithTutorCap(scored, 1, 12, BROAD_SEARCH_MAX_CARDS_PER_TUTOR);
  const t1OnPage1 = page1.items.filter((row) => row.tutorProfileId === "t1");
  assert.equal(t1OnPage1.length, 2);
  assert.deepEqual(
    t1OnPage1.map((row) => row.listingId),
    ["maths", "physics"],
  );
  assert.equal(
    page1.items.some((row) => row.listingId === "chem"),
    false,
  );
  assert.equal(page1.total, 4);
  assert.equal(page1.pages, 2);
  const page2 = paginateWithTutorCap(scored, 2, 12, BROAD_SEARCH_MAX_CARDS_PER_TUTOR);
  assert.equal(page2.items[0]?.listingId, "chem");
}

{
  const scored = [
    listing("t1", "a", "Mathematics", 9),
    listing("t1", "b", "Physics", 8),
    listing("t1", "c", "Chemistry", 7),
  ];
  const firstPage = paginateWithTutorCap(scored, 1, 2, 2);
  const secondPage = paginateWithTutorCap(scored, 2, 2, 2);
  assert.deepEqual(
    firstPage.items.map((row) => row.listingId),
    ["a", "b"],
  );
  assert.equal(secondPage.items[0]?.listingId, "c");
  const uncapped = paginateWithTutorCap(scored, 1, 12, Number.POSITIVE_INFINITY);
  assert.equal(uncapped.items.length, 3);
}

{
  const pageItems = [listing("t1", "maths", "Mathematics", 50), listing("t2", "eng", "English", 20)];
  const all = [
    ...pageItems,
    listing("t1", "physics", "Physics", 40),
    listing("t1", "chem", "Chemistry", 30),
  ];
  const withAlso = attachAlsoTeaches(pageItems, all);
  assert.deepEqual(
    withAlso[0]!.alsoTeaches.map((row) => row.subject),
    ["Physics", "Chemistry"],
  );
  assert.equal(withAlso[0]!.alsoTeaches[0]!.level, "");
  assert.deepEqual(withAlso[1]!.alsoTeaches, []);
}

{
  const samePage = [listing("t1", "maths", "Mathematics", 50), listing("t1", "physics", "Physics", 40)];
  const withAlso = attachAlsoTeaches(samePage, samePage);
  assert.deepEqual(withAlso[0]!.alsoTeaches, []);
}

{
  const rows = dedupeSearchByTutor([
    listing("t1", "l1", "Mathematics", 10),
    listing("t1", "l2", "Mathematics", 50),
    listing("t2", "l3", "Chemistry", 40),
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.listingId, "l2");
  assert.equal(rows[0]!.alsoTeaches.length, 1);
}

// Subject search: Madhu-style four Maths variants → one best card + alsoTeaches
{
  const scored = [
    listing("madhu", "olevel", "O Level Maths", 60),
    listing("madhu", "psle", "PSLE Maths", 55),
    listing("madhu", "addmaths", "Additional Mathematics", 50),
    listing("madhu", "further", "Further Mathematics", 45),
    listing("other", "maths", "Mathematics", 40),
  ];
  const page1 = paginateWithTutorCap(scored, 1, 12, SUBJECT_SEARCH_MAX_CARDS_PER_TUTOR);
  const madhuCards = page1.items.filter((row) => row.tutorProfileId === "madhu");
  assert.equal(madhuCards.length, 1);
  assert.equal(madhuCards[0]!.listingId, "olevel");
  assert.equal(page1.items.length, 2);
  const withAlso = attachAlsoTeaches(page1.items, scored);
  assert.deepEqual(
    withAlso[0]!.alsoTeaches.map((row) => row.subject),
    ["PSLE Maths", "Additional Mathematics", "Further Mathematics"],
  );
}

console.log("search-dedupe.test.ts: ok");
