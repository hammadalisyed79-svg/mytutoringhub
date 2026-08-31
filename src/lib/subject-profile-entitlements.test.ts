import assert from "node:assert/strict";
import {
  FREE_SUBJECT_PROFILES,
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
  isSubjectProfilePromoActive,
  resolveSubjectProfileActiveCap,
} from "@/lib/subject-profile-entitlements";

assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(FREE_SUBJECT_PROFILES_AFTER_PROMO, 1);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);
assert.equal(isSubjectProfilePromoActive(), false);
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
