import assert from "node:assert/strict";
import { computeDesiredTutorPublicActive } from "@/lib/tutor-public-eligibility";

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
};

// complete + verified + valid name → eligible
{
  const a = computeDesiredTutorPublicActive(base);
  assert.equal(a.desiredActive, true);
  assert.equal(a.listable, true);
  assert.equal(a.complete, true);
}

// incomplete + verified → not eligible
{
  const a = computeDesiredTutorPublicActive({ ...base, headline: "" });
  assert.equal(a.desiredActive, false);
  assert.ok(a.missingRequired.includes("Headline"));
}

// complete + unverified → not eligible
{
  const a = computeDesiredTutorPublicActive({ ...base, emailVerified: null });
  assert.equal(a.desiredActive, false);
  assert.ok(a.blockReasons.includes("email_unverified"));
}

// suspicious name → not eligible
{
  const a = computeDesiredTutorPublicActive({ ...base, name: "★★★★ http://spam.com" });
  assert.equal(a.desiredActive, false);
  assert.equal(a.suspiciousName, true);
}

// paid-incomplete is represented by incomplete profile (payment does not affect this helper)
{
  const a = computeDesiredTutorPublicActive({ ...base, subjects: "", qualifications: "" });
  assert.equal(a.desiredActive, false);
}

// free + complete + verified → eligible
{
  const a = computeDesiredTutorPublicActive(base);
  assert.equal(a.desiredActive, true);
}

// forceActive overrides ordinary blocks
{
  const a = computeDesiredTutorPublicActive({
    ...base,
    emailVerified: null,
    headline: "",
    forceActive: true,
  });
  assert.equal(a.desiredActive, true);
  assert.equal(a.forceActiveOverride, true);
}

// international name remains valid
{
  const a = computeDesiredTutorPublicActive({ ...base, name: "محمد أحمد" });
  assert.equal(a.suspiciousName, false);
  assert.equal(a.desiredActive, true);
}

console.log("tutor-public-eligibility.test.ts: ok");
