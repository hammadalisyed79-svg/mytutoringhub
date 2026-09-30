import assert from "node:assert/strict";
import {
  FREE_PLUS_EXTRA_ACTIVE_CAP,
  FREE_SUBJECT_PROFILES,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
} from "./subject-profile-entitlements";
import {
  isGrandfatheredFreeTeachingProfiles,
  resolveCreateTeachingProfileCap,
  resolvePlanTeachingProfileCap,
  shouldForcePausedTeachingProfileCreate,
} from "./teaching-profile-cap";

assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);
assert.equal(FREE_PLUS_EXTRA_ACTIVE_CAP, 3);

assert.equal(resolvePlanTeachingProfileCap({ unlimitedProfiles: false, hasTutorPro: false }), 1);
assert.equal(
  resolvePlanTeachingProfileCap({ unlimitedProfiles: false, hasTutorPro: false, extraActiveSlots: 2 }),
  3,
);
assert.equal(resolvePlanTeachingProfileCap({ unlimitedProfiles: false, hasTutorPro: true }), 10);

assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 3 }), 1);
assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 2 }), 1);
assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 1 }), 1);
assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 0 }), 1);
assert.equal(resolveCreateTeachingProfileCap({ planCap: 10, activeCount: 3 }), 10);

assert.equal(isGrandfatheredFreeTeachingProfiles(3, 1), false);
assert.equal(isGrandfatheredFreeTeachingProfiles(1, 1), false);

assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 1, activeCount: 0 }), false);
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 1, activeCount: 1 }), true);
assert.equal(shouldForcePausedTeachingProfileCreate({ planCap: 10, activeCount: 1 }), false);

console.log("teaching-profile-cap.test.ts: ok");
