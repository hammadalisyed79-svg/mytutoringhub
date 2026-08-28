import assert from "node:assert/strict";
import { computeTutorPlanTier } from "@/lib/subscription";

assert.equal(computeTutorPlanTier(new Set()), 0);
assert.equal(computeTutorPlanTier(new Set(["AD_BOOST"])), 0);
assert.equal(computeTutorPlanTier(new Set(["HIGHLIGHTED_AD"])), 0);
assert.equal(computeTutorPlanTier(new Set(["EXTRA_PROFILE_ADS"])), 0);
assert.equal(computeTutorPlanTier(new Set(["UNLIMITED_ADS"])), 0);
assert.equal(computeTutorPlanTier(new Set(["TUTOR_BASIC"])), 1);
assert.equal(computeTutorPlanTier(new Set(["TUTOR_BASIC", "AD_BOOST"])), 1);
assert.equal(computeTutorPlanTier(new Set(["VERIFIED_TUTOR"])), 2);
assert.equal(computeTutorPlanTier(new Set(["VERIFIED_TUTOR", "TUTOR_BASIC"])), 2);

console.log("subscription-entitlements.test.ts: ok");
