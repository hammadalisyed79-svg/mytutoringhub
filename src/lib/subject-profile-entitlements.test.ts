import assert from "node:assert/strict";
import {
  FREE_SUBJECT_PROFILES,
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
  UPGRADE_REQUIRED_CODE,
  isSubjectProfilePromoActive,
  resolveSubjectProfileActiveCap,
} from "@/lib/subject-profile-entitlements";
import {
  UPGRADE_FOR_MORE_PROFILES_MESSAGE,
  shouldForcePausedTeachingProfileCreate,
} from "@/lib/teaching-profile-cap";

assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(FREE_SUBJECT_PROFILES_AFTER_PROMO, 1);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);
assert.equal(isSubjectProfilePromoActive(), false);
assert.equal(UPGRADE_REQUIRED_CODE, "UPGRADE_REQUIRED");
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 1, activeCount: 1 }), true);
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 1, activeCount: 0 }), false);
assert.match(UPGRADE_FOR_MORE_PROFILES_MESSAGE, /1 active/);
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
