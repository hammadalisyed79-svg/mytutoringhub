/**
 * Free Teaching Profile create/reactivate ratchet (no schema).
 *
 * Plan entitlement remains FREE_SUBJECT_PROFILES (=1).
 * Grandfathered Free tutors who already have N>1 ACTIVE profiles may keep them.
 * Effective create cap = max(planCap, currentActiveCount) for Free:
 *   - at 3 active → cannot create/reactivate more (cap 3)
 *   - pause to 2 → cannot grow (cap 2)
 *   - at 1 → normal Free=1
 *   - at 0 → may create 1
 * Pausing never restores a higher create budget above current active.
 */

import {
  FREE_SUBJECT_PROFILES,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
} from "@/lib/subject-profile-entitlements";

export const UPGRADE_FOR_MORE_PROFILES_MESSAGE =
  "Free includes 1 active Teaching Profile. Upgrade to Tutor Pro to activate or run more (up to 10).";

/** True when Free (or grandfathered Free) is at/over plan ACTIVE cap — new rows must stay Paused. */
export function shouldForcePausedTeachingProfileCreate(opts: {
  planCap: number;
  activeCount: number;
}): boolean {
  if (!Number.isFinite(opts.planCap)) return false;
  if (opts.planCap > FREE_SUBJECT_PROFILES) return false;
  return opts.activeCount >= FREE_SUBJECT_PROFILES;
}

/** Plan-level Free/Pro/Unlimited cap (Boost never affects this). */
export function resolvePlanTeachingProfileCap(opts: {
  unlimitedProfiles: boolean;
  hasTutorPro: boolean;
  hasProfilePack?: boolean;
}): number {
  if (opts.unlimitedProfiles) return Number.POSITIVE_INFINITY;
  if (opts.hasTutorPro || opts.hasProfilePack) return TUTOR_PRO_SUBJECT_PROFILE_CAP;
  return FREE_SUBJECT_PROFILES;
}

/**
 * Cap used when creating or reactivating an ACTIVE Teaching Profile.
 * Free grandfather ratchet: cannot grow above current ACTIVE count when already ≥ Free=1.
 */
export function resolveCreateTeachingProfileCap(opts: {
  planCap: number;
  activeCount: number;
}): number {
  if (!Number.isFinite(opts.planCap)) return opts.planCap;
  if (opts.planCap > FREE_SUBJECT_PROFILES) return opts.planCap;
  return Math.max(FREE_SUBJECT_PROFILES, Math.max(0, opts.activeCount));
}

export function isGrandfatheredFreeTeachingProfiles(activeCount: number, planCap: number) {
  return Number.isFinite(planCap) && planCap <= FREE_SUBJECT_PROFILES && activeCount > FREE_SUBJECT_PROFILES;
}
