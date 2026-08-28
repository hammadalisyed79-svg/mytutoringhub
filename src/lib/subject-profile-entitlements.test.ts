import assert from "node:assert/strict";
import {
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
  PAID_SUBJECT_PROFILE_CAP,
  isSubjectProfilePromoActive,
  resolveSubjectProfileActiveCap,
  SUBJECT_PROFILE_PROMO_UNTIL,
} from "@/lib/subject-profile-entitlements";

const duringPromo = new Date(`${SUBJECT_PROFILE_PROMO_UNTIL}T12:00:00.000Z`);
const afterPromo = new Date("2026-10-01T00:00:00.000Z");

assert.equal(isSubjectProfilePromoActive(duringPromo), true);
assert.equal(isSubjectProfilePromoActive(afterPromo), false);

assert.equal(
  resolveSubjectProfileActiveCap({
    now: duringPromo,
    unlimitedProfiles: false,
    hasProfilePack: false,
  }),
  Number.POSITIVE_INFINITY,
);

assert.equal(
  resolveSubjectProfileActiveCap({
    now: afterPromo,
    unlimitedProfiles: false,
    hasProfilePack: false,
  }),
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
);

assert.equal(
  resolveSubjectProfileActiveCap({
    now: afterPromo,
    unlimitedProfiles: false,
    hasProfilePack: true,
  }),
  PAID_SUBJECT_PROFILE_CAP,
);

assert.equal(
  resolveSubjectProfileActiveCap({
    now: afterPromo,
    unlimitedProfiles: true,
    hasProfilePack: false,
  }),
  Number.POSITIVE_INFINITY,
);

assert.equal(FREE_SUBJECT_PROFILES_AFTER_PROMO, 1);
assert.equal(PAID_SUBJECT_PROFILE_CAP, 3);

console.log("subject-profile-entitlements.test.ts: ok");
