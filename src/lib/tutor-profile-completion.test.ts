import assert from "node:assert/strict";
import { getTutorProfileCompletion, isTutorTeachingComplete } from "@/lib/tutor-profile-completion";
import { isTutorProfileListable } from "@/lib/subscription";

const seedOnly = {
  name: "Hammad Syed",
  photoUrl: "https://example.com/photo.jpg",
  headline: "",
  bio: "I help students prepare for exams with clear weekly plans and past papers.",
  country: null,
  location: "Online",
  subjects: "",
  hourlyRate: 1500,
  online: true,
  inPerson: false,
  qualifications: "",
};

{
  const c = getTutorProfileCompletion(seedOnly);
  assert.equal(c.checks.find((r) => r.key === "city")?.ok, false, "Online without country is not city done");
  assert.equal(c.checks.find((r) => r.key === "country")?.ok, false);
  assert.equal(c.checks.find((r) => r.key === "teachingProfile")?.ok, false);
  assert.equal(c.checks.find((r) => r.key === "activeSearch")?.ok, false);
  assert.equal(c.checks.find((r) => r.key === "rate"), undefined, "Rate is no longer a separate checklist row");
  assert.equal(c.checks.find((r) => r.key === "lessonType"), undefined);
  assert.ok(c.missingRequired.includes("City"));
  assert.ok(c.missingRequired.includes("Country"));
  assert.ok(c.missingRequired.includes("Teaching Profile"));
  assert.ok(c.missingRequired.includes("Active in search"));
  assert.equal(isTutorTeachingComplete(seedOnly), false);
}

{
  const withCsvOnly = {
    ...seedOnly,
    country: "Germany",
    location: "Online",
    subjects: "Math",
    qualifications: "MSc",
    headline: "Experienced Math tutor",
  };
  const c = getTutorProfileCompletion(withCsvOnly);
  assert.equal(c.checks.find((r) => r.key === "city")?.ok, true);
  assert.equal(c.checks.find((r) => r.key === "teachingProfile")?.ok, false, "CSV subjects do not complete teaching");
  assert.equal(c.complete, false);
  assert.equal(isTutorProfileListable(withCsvOnly, withCsvOnly.name), false);
}

{
  const listed = {
    ...seedOnly,
    country: "Germany",
    location: "Online",
    subjects: "",
    hourlyRate: 0,
    qualifications: "MSc",
    headline: "Experienced Math tutor",
    hasValidTeachingProfile: true,
    hasValidListingRate: true,
    hasAnyTeachingProfile: true,
  };
  const c = getTutorProfileCompletion(listed);
  assert.equal(c.checks.find((r) => r.key === "teachingProfile")?.ok, true);
  assert.equal(c.checks.find((r) => r.key === "activeSearch")?.ok, true);
  assert.equal(c.complete, true);
  assert.equal(isTutorProfileListable(listed, listed.name), true);
}

{
  const fromRows = getTutorProfileCompletion({
    ...seedOnly,
    country: "Germany",
    location: "Berlin",
    qualifications: "MSc",
    headline: "Experienced Math tutor",
    subjects: "ignored-csv",
    hourlyRate: 100,
    subjectProfiles: [
      {
        status: "ACTIVE",
        subject: "Mathematics",
        rate: 2500,
        online: true,
        inPerson: false,
      },
    ],
  });
  assert.equal(fromRows.complete, true);
}

{
  const pausedOnly = getTutorProfileCompletion({
    ...seedOnly,
    country: "Germany",
    location: "Berlin",
    qualifications: "MSc",
    headline: "Experienced Math tutor",
    subjectProfiles: [
      { status: "PAUSED", subject: "Mathematics", rate: 2500, online: true, inPerson: false },
    ],
  });
  assert.equal(pausedOnly.checks.find((r) => r.key === "teachingProfile")?.ok, true, "Paused profile counts as having a Teaching Profile");
  assert.equal(pausedOnly.checks.find((r) => r.key === "activeSearch")?.ok, false);
  assert.equal(pausedOnly.complete, false);
}

{
  const cheapListing = getTutorProfileCompletion({
    ...seedOnly,
    country: "Germany",
    location: "Berlin",
    qualifications: "MSc",
    headline: "Experienced Math tutor",
    subjectProfiles: [
      { status: "ACTIVE", subject: "Mathematics", rate: 100, online: true, inPerson: false },
    ],
  });
  assert.equal(cheapListing.complete, false, "Listing rate below 500 PKR is not listable");
}

console.log("tutor-profile-completion.test.ts: ok");
