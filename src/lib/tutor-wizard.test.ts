import assert from "node:assert/strict";
import {
  resolveTutorWizardResumeStep,
  resolveTutorWorkspaceBlock,
  TUTOR_WIZARD_STEP_IDS,
  TUTOR_WIZARD_EXTRA_IDS,
  TUTOR_WORKSPACE_BLOCK_IDS,
  TUTOR_WORKSPACE_BLOCKS,
} from "@/lib/tutor-wizard";

assert.deepEqual([...TUTOR_WIZARD_STEP_IDS], ["photo", "basics", "place", "teaching", "finish"]);
assert.deepEqual([...TUTOR_WIZARD_EXTRA_IDS], ["details", "schedule", "contact", "verify"]);
assert.deepEqual(
  [...TUTOR_WORKSPACE_BLOCK_IDS],
  ["setup", "subjects", "details", "schedule", "contact", "verify"],
);
assert.equal(TUTOR_WORKSPACE_BLOCKS.length, 6);
assert.equal(resolveTutorWorkspaceBlock({ setupComplete: false, hasTeachingProfile: false }), "setup");
assert.equal(resolveTutorWorkspaceBlock({ setupComplete: true, hasTeachingProfile: false }), "subjects");
assert.equal(resolveTutorWorkspaceBlock({ setupComplete: true, hasTeachingProfile: true }), "setup");
assert.equal(
  resolveTutorWorkspaceBlock({ setupComplete: true, hasTeachingProfile: true, verifyRequested: true }),
  "verify",
);

const almostDone = {
  name: "Sara Ahmed",
  photoUrl: "https://example.com/photo.jpg",
  headline: "A Level Chemistry specialist",
  bio: "I help students prepare for A Level Chemistry with past papers and weekly homework plans.",
  country: "United Kingdom",
  location: "London",
  subjects: "",
  hourlyRate: 0,
  online: true,
  inPerson: false,
  qualifications: "MSc Chemistry",
};

assert.equal(resolveTutorWizardResumeStep({ ...almostDone, photoUrl: "" }), "photo");
assert.equal(resolveTutorWizardResumeStep({ ...almostDone, bio: "short" }), "basics");
assert.equal(resolveTutorWizardResumeStep({ ...almostDone, country: "" }), "place");
assert.equal(
  resolveTutorWizardResumeStep({ ...almostDone, qualifications: "" }),
  "teaching",
  "quals / teaching preferences still resume on teaching step",
);
assert.equal(
  resolveTutorWizardResumeStep(almostDone),
  "finish",
  "required steps done → Save (extras are collapsed, not forced)",
);
assert.equal(
  resolveTutorWizardResumeStep({ ...almostDone, subjects: "Chemistry", hourlyRate: 2500 }),
  "finish",
);
assert.equal(
  resolveTutorWizardResumeStep({ ...almostDone, hasValidTeachingProfile: true, hasValidListingRate: true }),
  "finish",
);
assert.equal(
  resolveTutorWizardResumeStep(
    { ...almostDone, hasValidTeachingProfile: true },
    { live: true },
  ),
  "finish",
);

console.log("tutor-wizard.test.ts: ok");
