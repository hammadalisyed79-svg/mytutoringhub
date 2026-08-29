import assert from "node:assert/strict";
import {
  dedupeFeaturedListingsByTutor,
  featuredListingContextLine,
  featuredShortLine,
  pickHeroShowcaseTutor,
} from "./featured-tutors";

{
  const rows = dedupeFeaturedListingsByTutor(
    [
      { listingId: "l1", tutorProfileId: "t1" },
      { listingId: "l2", tutorProfileId: "t1" },
      { listingId: "l3", tutorProfileId: "t2" },
      { listingId: "l4", tutorProfileId: "t3" },
      { listingId: "l5", tutorProfileId: "t2" },
      { listingId: "l6", tutorProfileId: "t4" },
      { listingId: "l7", tutorProfileId: "t5" },
    ],
    4,
  );
  assert.deepEqual(
    rows.map((r) => r.listingId),
    ["l1", "l3", "l4", "l6"],
  );
  assert.deepEqual(
    rows.map((r) => r.tutorProfileId),
    ["t1", "t2", "t3", "t4"],
  );
  assert.equal(new Set(rows.map((r) => r.tutorProfileId)).size, rows.length);
}

{
  const empty = dedupeFeaturedListingsByTutor([], 4);
  assert.equal(empty.length, 0);
}

{
  const skipped = dedupeFeaturedListingsByTutor(
    [
      { listingId: "a", tutorProfileId: "" },
      { listingId: "b", tutorProfileId: "  " },
      { listingId: "c", tutorProfileId: "ok" },
    ],
    4,
  );
  assert.deepEqual(
    skipped.map((r) => r.listingId),
    ["c"],
  );
}

{
  assert.equal(
    featuredListingContextLine({
      qualification: "A Level",
      board: "Cambridge",
      level: "All levels",
    }),
    "A Level · Cambridge",
  );
  assert.equal(featuredListingContextLine({ level: "GCSE" }), "GCSE");
  assert.equal(featuredListingContextLine({}), "");
}

{
  assert.equal(featuredShortLine("Short bio."), "Short bio.");
  const long = "a".repeat(200);
  const clipped = featuredShortLine(long, 50);
  assert.ok(clipped.endsWith("…"));
  assert.ok(clipped.length <= 50);
}

{
  const incomplete = pickHeroShowcaseTutor([
    {
      listingId: "l0",
      tutorProfileId: "t0",
      photoUrl: null,
      hourlyRate: 40,
      subject: "Maths",
      user: { name: "No Photo" },
    },
  ]);
  assert.equal(incomplete, null);

  const picked = pickHeroShowcaseTutor([
    {
      listingId: "l1",
      tutorProfileId: "t1",
      photoUrl: "/local.jpg",
      hourlyRate: 30,
      subject: "Physics",
      user: { name: "Local Only" },
    },
    {
      listingId: "l2",
      tutorProfileId: "t2",
      photoUrl: "https://cdn.example/a.jpg",
      hourlyRate: 45,
      subject: "Chemistry",
      user: { name: "Ada Tutor" },
    },
    {
      listingId: "l3",
      tutorProfileId: "t3",
      photoUrl: "https://cdn.example/b.jpg",
      hourlyRate: 50,
      subject: "Biology",
      user: { name: "Second Complete" },
    },
  ]);
  assert.equal(picked?.listingId, "l2");
  assert.equal(picked?.user.name, "Ada Tutor");
}

console.log("featured-tutors.test.ts: ok");
