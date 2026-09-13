/**
 * Free Teaching Profile create/reactivate ratchet + Extra Active stacking.
 *
 * Plan entitlement:
 *   Free = 1 ACTIVE
 *   + each EXTRA_ACTIVE sub (max 2) → up to 3 ACTIVE
 *   Tutor Pro / legacy Extra pack = 10
 *   Unlimited = ∞
 *
 * Grandfathered Free tutors who already have N>1 ACTIVE may keep them
 * (ratchet via resolveCreateTeachingProfileCap). Never auto-paused.
 */

import {
  FREE_SUBJECT_PROFILES,
  FREE_PLUS_EXTRA_ACTIVE_CAP,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
} from "@/lib/subject-profile-entitlements";

export const UPGRADE_FOR_MORE_PROFILES_MESSAGE =
  "Free includes 1 active Teaching Profile. Add Extra Active (monthly, up to 3 live) or upgrade to Tutor Pro (up to 10).";

/** True when Free/extra path is at ACTIVE cap — new rows must stay Paused. */
export function shouldForcePausedTeachingProfileCreate(opts: {
  planCap: number;
  activeCount: number;
}): boolean {
  if (!Number.isFinite(opts.planCap)) return false;
  if (opts.planCap >= TUTOR_PRO_SUBJECT_PROFILE_CAP) return false;
  return opts.activeCount >= opts.planCap;
}

/** Plan-level Free / Extra Active / Pro / Unlimited cap (Boost never affects this). */
export function resolvePlanTeachingProfileCap(opts: {
  unlimitedProfiles: boolean;
  hasTutorPro: boolean;
  hasProfilePack?: boolean;
  /** Count of active EXTRA_ACTIVE subscriptions (0–2). Ignored when Pro/Unlimited. */
  extraActiveSlots?: number;
}): number {
  if (opts.unlimitedProfiles) return Number.POSITIVE_INFINITY;
  if (opts.hasTutorPro || opts.hasProfilePack) return TUTOR_PRO_SUBJECT_PROFILE_CAP;
  const extras = Math.max(0, Math.min(2, Math.floor(opts.extraActiveSlots || 0)));
  return Math.min(FREE_PLUS_EXTRA_ACTIVE_CAP, FREE_SUBJECT_PROFILES + extras);
}

/**
 * Cap used when creating or reactivating an ACTIVE Teaching Profile.
 * Free grandfather ratchet: cannot grow above current ACTIVE count when already ≥ plan cap
 * and still on Free/extra path without enough slots.
 */
export function resolveCreateTeachingProfileCap(opts: {
  planCap: number;
  activeCount: number;
}): number {
  if (!Number.isFinite(opts.planCap)) return opts.planCap;
  if (opts.planCap > FREE_PLUS_EXTRA_ACTIVE_CAP) return opts.planCap;
  return Math.max(opts.planCap, Math.max(0, opts.activeCount));
}

export function isGrandfatheredFreeTeachingProfiles(activeCount: number, planCap: number) {
  return (
    Number.isFinite(planCap) &&
    planCap <= FREE_PLUS_EXTRA_ACTIVE_CAP &&
    activeCount > planCap
  );
}
