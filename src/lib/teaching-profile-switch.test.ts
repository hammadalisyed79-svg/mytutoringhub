import assert from "node:assert/strict";
import {
  TEACHING_PROFILE_FREE_SWITCHES_PER_MONTH,
  TEACHING_PROFILE_SWITCH_HONEYMOON_DAYS,
} from "@/lib/teaching-profile-switch";
import {
  FREE_PLUS_EXTRA_ACTIVE_CAP,
  FREE_TEACHING_PROFILE_ROW_CAP,
  EXTRA_ACTIVE_SLOT_MAX,
} from "@/lib/subject-profile-entitlements";

assert.equal(TEACHING_PROFILE_SWITCH_HONEYMOON_DAYS, 14);
assert.equal(TEACHING_PROFILE_FREE_SWITCHES_PER_MONTH, 4);
assert.equal(FREE_PLUS_EXTRA_ACTIVE_CAP, 3);
assert.equal(EXTRA_ACTIVE_SLOT_MAX, 2);
assert.equal(FREE_TEACHING_PROFILE_ROW_CAP, 10);

console.log("teaching-profile-switch.test.ts: ok");
