import assert from "node:assert/strict";
import {
  FREE_SUBJECT_PROFILES,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
  resolveSubjectProfileActiveCap,
} from "@/lib/subject-profile-entitlements";
import {
  UPGRADE_FOR_MORE_PROFILES_MESSAGE,
  isGrandfatheredFreeTeachingProfiles,
  resolveCreateTeachingProfileCap,
  resolvePlanTeachingProfileCap,
} from "@/lib/teaching-profile-cap";

assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);

assert.equal(
  resolvePlanTeachingProfileCap({ unlimitedProfiles: false, hasTutorPro: false }),
  1,
);
assert.equal(
  resolvePlanTeachingProfileCap({ unlimitedProfiles: false, hasTutorPro: true }),
  10,
);

// Grandfather ratchet: cannot grow; ratchets down with active count
assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 3 }), 3);
assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 2 }), 2);
assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 1 }), 1);
assert.equal(resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 0 }), 1);

// At 3 active, create blocked (active >= createCap)
assert.ok(3 >= resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 3 }));
// After pause to 1, still cannot create a 2nd
assert.ok(1 >= resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 1 }));
// At 0, can create one
assert.ok(0 < resolveCreateTeachingProfileCap({ planCap: 1, activeCount: 0 }));

// Pro ignores free ratchet
assert.equal(resolveCreateTeachingProfileCap({ planCap: 10, activeCount: 3 }), 10);

assert.ok(isGrandfatheredFreeTeachingProfiles(3, 1));
assert.ok(!isGrandfatheredFreeTeachingProfiles(1, 1));
assert.ok(!isGrandfatheredFreeTeachingProfiles(3, 10));

assert.match(UPGRADE_FOR_MORE_PROFILES_MESSAGE, /Upgrade to Tutor Pro.*10 Teaching Profiles/);

assert.equal(
  resolveSubjectProfileActiveCap({ unlimitedProfiles: false, hasTutorPro: false }),
  1,
);

console.log("teaching-profile-cap.test.ts: ok");
