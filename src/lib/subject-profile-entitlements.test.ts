import assert from "node:assert/strict";
import {
  FREE_SUBJECT_PROFILES,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
  resolveSubjectProfileActiveCap,
} from "@/lib/subject-profile-entitlements";

assert.equal(FREE_SUBJECT_PROFILES, 3);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);

assert.equal(
  resolveSubjectProfileActiveCap({
    unlimitedProfiles: false,
    hasTutorPro: false,
  }),
  FREE_SUBJECT_PROFILES,
);

assert.equal(
  resolveSubjectProfileActiveCap({
    unlimitedProfiles: false,
    hasTutorPro: true,
  }),
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
);

assert.equal(
  resolveSubjectProfileActiveCap({
    unlimitedProfiles: false,
    hasTutorPro: false,
    hasProfilePack: true,
  }),
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
);

assert.equal(
  resolveSubjectProfileActiveCap({
    unlimitedProfiles: true,
    hasTutorPro: false,
  }),
  Number.POSITIVE_INFINITY,
);

console.log("subject-profile-entitlements.test.ts: ok");
