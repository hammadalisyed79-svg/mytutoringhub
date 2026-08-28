import assert from "node:assert/strict";
import { dedupeSearchByTutor } from "./search-dedupe";

{
  const rows = dedupeSearchByTutor([
    {
      tutorProfileId: "t1",
      listingId: "l1",
      subject: "Mathematics",
      title: "GCSE Maths",
      level: "GCSE",
      score: 10,
    },
    {
      tutorProfileId: "t1",
      listingId: "l2",
      subject: "Mathematics",
      title: "A Level Maths",
      level: "A Level",
      score: 50,
    },
    {
      tutorProfileId: "t2",
      listingId: "l3",
      subject: "Chemistry",
      title: "Chemistry 5070",
      level: "O Level",
      score: 40,
    },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.listingId, "l2");
  assert.equal(rows[0]!.alsoTeaches.length, 1);
  assert.equal(rows[0]!.alsoTeaches[0]!.listingId, "l1");
  assert.equal(rows[1]!.listingId, "l3");
  assert.deepEqual(rows[1]!.alsoTeaches, []);
}

{
  const rows = dedupeSearchByTutor(
    [
      {
        tutorProfileId: "t1",
        listingId: "a",
        subject: "Maths",
        title: "A",
        level: "GCSE",
        score: 5,
      },
      {
        tutorProfileId: "t1",
        listingId: "b",
        subject: "Physics",
        title: "B",
        level: "A Level",
        score: 4,
      },
      {
        tutorProfileId: "t1",
        listingId: "c",
        subject: "Chemistry",
        title: "C",
        level: "O Level",
        score: 3,
      },
      {
        tutorProfileId: "t1",
        listingId: "d",
        subject: "Biology",
        title: "D",
        level: "IGCSE",
        score: 2,
      },
      {
        tutorProfileId: "t1",
        listingId: "e",
        subject: "English",
        title: "E",
        level: "GCSE",
        score: 1,
      },
    ],
    3,
  );
  assert.equal(rows[0]!.alsoTeaches.length, 3);
}

console.log("search-dedupe.test.ts: ok");
