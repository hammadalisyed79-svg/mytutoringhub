/**
 * Free Teaching Profile create/reactivate caps + Extra Active stacking.
 *
 * Plan entitlement:
 *   Free = 1 ACTIVE
 *   + each EXTRA_ACTIVE sub (max 2) → up to 3 ACTIVE
 *   Tutor Pro / legacy Extra pack = 10
 *   Unlimited = ∞
 *
 * Free over-cap listings are paused to plan cap (no grandfather ratchet).
 */

import {
  FREE_SUBJECT_PROFILES,
  FREE_PLUS_EXTRA_ACTIVE_CAP,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
} from "@/lib/subject-profile-entitlements";

export const UPGRADE_FOR_MORE_PROFILES_MESSAGE =
  "Free includes 1 active Teaching Profile. Upgrade to Tutor Pro for up to 10 active Teaching Profiles.";

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
 * Equals the plan cap (Free=1 / Extra / Pro=10). No grandfather ratchet.
 */
export function resolveCreateTeachingProfileCap(opts: {
  planCap: number;
  /** @deprecated Ignored — Free over-cap is no longer ratcheted. */
  activeCount: number;
}): number {
  void opts.activeCount;
  return opts.planCap;
}

/** @deprecated Free over-cap is enforced; always false. */
export function isGrandfatheredFreeTeachingProfiles(activeCount: number, planCap: number) {
  void activeCount;
  void planCap;
  return false;
}
