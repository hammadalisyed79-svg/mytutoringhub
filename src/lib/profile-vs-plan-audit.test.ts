import assert from "node:assert/strict";
import { profileVsPlanHardFailures, type ProfileVsPlanAudit } from "@/lib/profile-vs-plan-audit";
import { FREE_SUBJECT_PROFILES, TUTOR_PRO_SUBJECT_PROFILE_CAP } from "@/lib/subject-profile-entitlements";
import { BUSINESS } from "@/lib/business-rules";

assert.equal(BUSINESS.tutorFreeActiveListings, FREE_SUBJECT_PROFILES);
assert.equal(BUSINESS.tutorProActiveListings, TUTOR_PRO_SUBJECT_PROFILE_CAP);
assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);

const clean: ProfileVsPlanAudit = {
  generatedAt: new Date().toISOString(),
  totals: {
    tutorsWithActiveListings: 10,
    ok: 10,
    proOverCap: 0,
    freeGrandfatherOverCap: 0,
    expiredProStyleOverFree: 0,
    zeroActiveSkipped: 0,
  },
  samples: [],
  businessCaps: { free: 1, tutorPro: 10 },
};
assert.equal(profileVsPlanHardFailures(clean).ok, true);

const proOver: ProfileVsPlanAudit = {
  ...clean,
  totals: { ...clean.totals, ok: 9, proOverCap: 1 },
};
assert.equal(profileVsPlanHardFailures(proOver).ok, false);
assert.equal(profileVsPlanHardFailures(proOver).proOverCap, 1);

// Grandfather Free excess is not a hard failure
const grandfather: ProfileVsPlanAudit = {
  ...clean,
  totals: { ...clean.totals, ok: 8, freeGrandfatherOverCap: 2 },
};
assert.equal(profileVsPlanHardFailures(grandfather).ok, true);

console.log("profile-vs-plan-audit.test.ts: ok");
