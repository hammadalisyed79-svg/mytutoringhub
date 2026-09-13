import assert from "node:assert/strict";
import {
  FREE_SUBJECT_PROFILES,
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
  FREE_PLUS_EXTRA_ACTIVE_CAP,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
  UPGRADE_REQUIRED_CODE,
  isSubjectProfilePromoActive,
  resolveSubjectProfileActiveCap,
} from "@/lib/subject-profile-entitlements";
import {
  UPGRADE_FOR_MORE_PROFILES_MESSAGE,
  shouldForcePausedTeachingProfileCreate,
  resolvePlanTeachingProfileCap,
} from "@/lib/teaching-profile-cap";

assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(FREE_SUBJECT_PROFILES_AFTER_PROMO, 1);
assert.equal(FREE_PLUS_EXTRA_ACTIVE_CAP, 3);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);
assert.equal(isSubjectProfilePromoActive(), false);
assert.equal(UPGRADE_REQUIRED_CODE, "UPGRADE_REQUIRED");
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 1, activeCount: 1 }), true);
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 2, activeCount: 1 }), false);
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 2, activeCount: 2 }), true);
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 10, activeCount: 10 }), false);
assert.match(UPGRADE_FOR_MORE_PROFILES_MESSAGE, /Tutor Pro/);
assert.doesNotMatch(UPGRADE_FOR_MORE_PROFILES_MESSAGE, /Extra Active/);

assert.equal(
  resolveSubjectProfileActiveCap({
    unlimitedProfiles: false,
    hasTutorPro: false,
  }),
  FREE_SUBJECT_PROFILES,
);

assert.equal(
  resolvePlanTeachingProfileCap({
    unlimitedProfiles: false,
    hasTutorPro: false,
    extraActiveSlots: 1,
  }),
  2,
);

assert.equal(
  resolvePlanTeachingProfileCap({
    unlimitedProfiles: false,
    hasTutorPro: false,
    extraActiveSlots: 2,
  }),
  3,
);

assert.equal(
  resolvePlanTeachingProfileCap({
    unlimitedProfiles: false,
    hasTutorPro: false,
    extraActiveSlots: 9,
  }),
  3,
);

assert.equal(
  resolveSubjectProfileActiveCap({
    unlimitedProfiles: false,
    hasTutorPro: true,
    extraActiveSlots: 2,
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
