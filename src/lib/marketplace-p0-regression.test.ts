import assert from "node:assert/strict";
import {
  computeDesiredTutorPublicActive,
  filterCanonicallyPublicTutors,
  isCanonicallyPublicTutor,
} from "./tutor-public-eligibility";
import { formatHourly } from "./currency";
import { formatTutorAvailability } from "./tutor-catalog";

const base = {
  name: "Sara Ahmed",
  photoUrl: "https://example.com/photo.jpg",
  headline: "A Level Chemistry specialist",
  bio: "I help students prepare for A Level Chemistry with past papers and weekly homework plans.",
  country: "United Kingdom",
  location: "London",
  subjects: "Chemistry",
  hourlyRate: 2500,
  online: true,
  inPerson: false,
  qualifications: "MSc Chemistry",
  emailVerified: new Date(),
  forceActive: false,
  active: true,
  user: { name: "Sara Ahmed", emailVerified: new Date(), suspended: false },
};

// K — homepage-style count equals search-style canonical population
{
  const listed = [
    { ...base, id: "a" },
    {
      ...base,
      id: "b",
      active: true,
      emailVerified: null,
      user: { ...base.user, emailVerified: null },
    },
    { ...base, id: "c", active: false },
  ];
  const homepageCount = filterCanonicallyPublicTutors(listed).length;
  const searchCount = listed.filter(isCanonicallyPublicTutor).length;
  assert.equal(homepageCount, searchCount);
  assert.equal(homepageCount, 1);
}

// L — featured tutors ⊆ canonical public tutors
{
  const featuredRaw = [
    { ...base, id: "ok" },
    { ...base, id: "hidden", active: true, headline: "" },
  ];
  const featured = filterCanonicallyPublicTutors(featuredRaw).slice(0, 3);
  assert.equal(featured.length, 1);
  assert.equal(featured[0]?.id, "ok");
}

// J — rate formatter single unit
{
  const rate = formatHourly(5000, "GBP");
  assert.match(rate, /\/hr$/);
  assert.ok(!rate.includes("/hr/hr"));
  assert.ok(!rate.includes("/ hour"));
}

// I — location formatter no duplicate Online
{
  const line = formatTutorAvailability({
    location: "Online",
    country: "Pakistan",
    online: true,
    inPerson: false,
  });
  assert.equal(line, "Online, Pakistan");
  assert.ok(!line.includes("Online · Online"));
}

// G/H — verified badge field is independent of subscription (sync preserves DB flag only)
{
  const unverified = computeDesiredTutorPublicActive({ ...base, name: "Test Tutor" });
  assert.equal(unverified.desiredActive, true);
}

console.log("marketplace-p0-regression.test.ts: ok");
