import assert from "node:assert/strict";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";

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
  assert.equal(c.checks.find((r) => r.key === "rate")?.ok, false, "Seed rate without subjects is not done");
  assert.equal(c.checks.find((r) => r.key === "lessonType")?.ok, false, "Seed online without subjects is not done");
  assert.equal(c.checks.find((r) => r.key === "subjects")?.ok, false);
  assert.ok(c.missingRequired.includes("City"));
  assert.ok(c.missingRequired.includes("Country"));
  assert.ok(c.missingRequired.includes("Hourly rate"));
  assert.ok(c.missingRequired.includes("Lesson type"));
}

{
  const c = getTutorProfileCompletion({
    ...seedOnly,
    country: "Germany",
    location: "Online",
    subjects: "Math",
    qualifications: "MSc",
    headline: "Experienced Math tutor",
  });
  assert.equal(c.checks.find((r) => r.key === "city")?.ok, true);
  assert.equal(c.checks.find((r) => r.key === "rate")?.ok, true);
  assert.equal(c.checks.find((r) => r.key === "lessonType")?.ok, true);
  assert.equal(c.complete, true);
}

console.log("tutor-profile-completion.test.ts: ok");
