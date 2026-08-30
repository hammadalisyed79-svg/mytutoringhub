import assert from "node:assert/strict";
import { buildTutorProfileStatus } from "@/lib/tutor-profile-status";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";

const completeBase = {
  name: "Sara Ahmed",
  photoUrl: "https://example.com/photo.jpg",
  headline: "A Level Chemistry specialist",
  bio: "I help students prepare for A Level Chemistry with past papers and weekly homework plans.",
  country: "United Kingdom",
  location: "London",
  subjects: "Chemistry",
  hourlyRate: 2500,
  hasValidTeachingProfile: true,
  hasValidListingRate: true,
  online: true,
  inPerson: false,
  qualifications: "MSc Chemistry",
  emailVerified: new Date(),
  forceActive: false,
  profileId: "tp_test",
};

// Incomplete tutor sees missing requirements + INCOMPLETE (not LIVE from paid plan)
{
  const view = buildTutorProfileStatus({
    ...completeBase,
    headline: "",
    qualifications: "",
    active: false,
    suspended: false,
  });
  assert.equal(view.status, "INCOMPLETE");
  assert.ok(view.percent < 100);
  assert.ok(view.stepsRemaining >= 2);
  assert.ok(view.missingLabels.includes("Headline"));
  assert.ok(view.missingLabels.includes("Highest qualification"));
  assert.equal(view.cta?.label, "Complete my profile");
  assert.notEqual(view.status, "LIVE");
}

// Complete eligible + active DB flag → LIVE
{
  const view = buildTutorProfileStatus({
    ...completeBase,
    active: true,
    suspended: false,
  });
  assert.equal(view.status, "LIVE");
  assert.equal(view.percent, 100);
  assert.equal(view.cta?.label, "View public profile");
  assert.ok(view.summary.toLowerCase().includes("visible"));
}

// Paid plan does not invent LIVE when profile incomplete / inactive
{
  const view = buildTutorProfileStatus({
    ...completeBase,
    headline: "Short",
    active: false,
    suspended: false,
  });
  assert.equal(view.status, "INCOMPLETE");
  assert.notEqual(view.status, "LIVE");
}

// Suspicious tutor is not encouraged with ordinary “go public” certainty — stays INCOMPLETE
{
  const view = buildTutorProfileStatus({
    ...completeBase,
    name: "★★★★ http://spam.com",
    active: false,
    suspended: false,
  });
  assert.equal(view.status, "INCOMPLETE");
  assert.equal(view.suspiciousName, true);
  assert.ok(view.checks.some((c) => c.key === "name_quality" && !c.ok));
  assert.ok(view.summary.toLowerCase().includes("name") || view.stepsRemaining >= 1);
}

// Suspended tutor does not get ordinary activation status
{
  const view = buildTutorProfileStatus({
    ...completeBase,
    active: true,
    suspended: true,
  });
  assert.equal(view.status, "SUSPENDED");
  assert.equal(view.isLiveInSearch, false);
  assert.equal(view.cta, null);
}

// Status card percent uses canonical completion (+ email gate)
{
  const completion = getTutorProfileCompletion(completeBase);
  const view = buildTutorProfileStatus({
    ...completeBase,
    emailVerified: null,
    active: false,
  });
  assert.equal(completion.complete, true);
  assert.ok(view.checks.some((c) => c.key === "email" && !c.ok));
  assert.equal(view.status, "INCOMPLETE");
  assert.ok(view.percent < 100);
}

console.log("tutor-profile-status.test.ts: ok");
