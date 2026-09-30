import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/types";
import {
  UPGRADE_FOR_MORE_PROFILES_MESSAGE,
  resolveCreateTeachingProfileCap,
  resolvePlanTeachingProfileCap,
  shouldForcePausedTeachingProfileCreate,
} from "@/lib/teaching-profile-cap";

/**
 * Marketplace Teaching Profile caps (master commercial model).
 * Free = 1 ACTIVE.
 * Extra Active (monthly, stackable ×2) → up to 3 ACTIVE.
 * Tutor Pro (TUTOR_BASIC) = 10.
 * Legacy EXTRA_PROFILE_ADS → Pro cap; UNLIMITED_ADS → ∞.
 *
 * Free may hold up to FREE_TEACHING_PROFILE_ROW_CAP rows (Paused drafts).
 * Existing Free tutors with >1 ACTIVE are grandfathered (never auto-paused).
 */
export const FREE_SUBJECT_PROFILES = 1;
export const EXTRA_ACTIVE_SLOT_MAX = 2;
export const FREE_PLUS_EXTRA_ACTIVE_CAP = FREE_SUBJECT_PROFILES + EXTRA_ACTIVE_SLOT_MAX;
export const TUTOR_PRO_SUBJECT_PROFILE_CAP = 10;
/** Max Teaching Profile rows (any status) on Free / Extra path. */
export const FREE_TEACHING_PROFILE_ROW_CAP = 10;

export const UPGRADE_REQUIRED_CODE = "UPGRADE_REQUIRED";
export const SWITCH_LIMIT_CODE = "SWITCH_LIMIT";

/** @deprecated Free listings are never auto-paused; kept for env compatibility. */
export function shouldEnforceFreeTeachingProfilePause() {
  return false;
}

/** @deprecated Use FREE_SUBJECT_PROFILES — V2 has no promo sunset on free listings. */
export const FREE_SUBJECT_PROFILES_DURING_PROMO = FREE_SUBJECT_PROFILES;
/** @deprecated Use FREE_SUBJECT_PROFILES — free allotment is permanent in V2. */
export const FREE_SUBJECT_PROFILES_AFTER_PROMO = FREE_SUBJECT_PROFILES;
/** @deprecated Use TUTOR_PRO_SUBJECT_PROFILE_CAP. */
export const PAID_SUBJECT_PROFILE_CAP = TUTOR_PRO_SUBJECT_PROFILE_CAP;

/** @deprecated Promo date retired from listing-cap model; kept for email/compat imports. */
export const SUBJECT_PROFILE_PROMO_UNTIL = "2026-09-30";

const TUTOR_PRO_PLANS: SubscriptionPlan[] = ["TUTOR_BASIC", "EXTRA_PROFILE_ADS"];

async function hasPlan(userId: string, plan: SubscriptionPlan) {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      plan,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
    select: { id: true },
  });
  return Boolean(sub);
}

async function hasAnyPlan(userId: string, plans: SubscriptionPlan[]) {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: { in: plans },
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
    select: { id: true },
  });
  return Boolean(sub);
}

/** Count stackable Extra Active monthly slots (capped at EXTRA_ACTIVE_SLOT_MAX). */
export async function countExtraActiveSlots(userId: string, now = new Date()): Promise<number> {
  const count = await prisma.subscription.count({
    where: {
      userId,
      plan: "EXTRA_ACTIVE",
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
  });
  return Math.min(EXTRA_ACTIVE_SLOT_MAX, count);
}

/** @deprecated Listing caps no longer use a promo window. Always false. */
export function isSubjectProfilePromoActive(_now = new Date()): boolean {
  return false;
}

export function subjectProfilePromoLabel(_now = new Date()): string {
  return `Free: ${FREE_SUBJECT_PROFILES} active · Extra Active: up to ${FREE_PLUS_EXTRA_ACTIVE_CAP} · Tutor Pro: up to ${TUTOR_PRO_SUBJECT_PROFILE_CAP} · Boost does not add capacity.`;
}

/**
 * Resolve how many ACTIVE subject profiles a tutor may run.
 * Pure helper for tests — pass plan flags explicitly.
 */
export function resolveSubjectProfileActiveCap(opts: {
  now?: Date;
  unlimitedProfiles: boolean;
  hasTutorPro: boolean;
  /** @deprecated Alias for hasTutorPro (legacy Extra Profile Ads). */
  hasProfilePack?: boolean;
  extraActiveSlots?: number;
}): number {
  return resolvePlanTeachingProfileCap(opts);
}

export async function getSubjectProfileActiveCap(userId: string, now = new Date()): Promise<number> {
  const [unlimited, tutorPro, extraActiveSlots] = await Promise.all([
    hasPlan(userId, "UNLIMITED_ADS"),
    hasAnyPlan(userId, TUTOR_PRO_PLANS),
    countExtraActiveSlots(userId, now),
  ]);
  return resolveSubjectProfileActiveCap({
    unlimitedProfiles: unlimited,
    hasTutorPro: tutorPro,
    extraActiveSlots,
  });
}

export async function countActiveSubjectProfiles(userId: string): Promise<number> {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return 0;
  return prisma.subjectProfile.count({
    where: { tutorProfileId: profile.id, status: "ACTIVE" },
  });
}

export async function countAllSubjectProfiles(userId: string): Promise<number> {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return 0;
  return prisma.subjectProfile.count({
    where: { tutorProfileId: profile.id },
  });
}

export type SubjectProfileGate =
  | {
      ok: true;
      profile: { id: string };
      activeCount: number;
      cap: number;
      /** Create must persist as PAUSED (already at ACTIVE cap). */
      forcePaused?: boolean;
      extraActiveSlots?: number;
      canBuyExtraActive?: boolean;
    }
  | {
      ok: false;
      reason: string;
      activeCount?: number;
      cap?: number;
      code?: typeof UPGRADE_REQUIRED_CODE | typeof SWITCH_LIMIT_CODE;
      extraActiveSlots?: number;
      canBuyExtraActive?: boolean;
    };

async function loadTutorGateContext(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true, emailVerified: true, role: true },
  });
  if (!user) return { ok: false as const, reason: "Create your tutor profile first" };
  if (user.suspended) return { ok: false as const, reason: "Account suspended" };
  if (user.role !== "ADMIN" && user.role !== "TUTOR") {
    return { ok: false as const, reason: "Switch to a tutor account to publish Teaching Profiles" };
  }
  if (user.role !== "ADMIN" && !user.emailVerified) {
    return { ok: false as const, reason: "Verify your email to publish Teaching Profiles" };
  }

  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) return { ok: false as const, reason: "Create your tutor profile first" };

  const [planCap, activeCount, extraActiveSlots, totalRows] = await Promise.all([
    getSubjectProfileActiveCap(userId, now),
    prisma.subjectProfile.count({
      where: { tutorProfileId: profile.id, status: "ACTIVE" },
    }),
    countExtraActiveSlots(userId, now),
    prisma.subjectProfile.count({
      where: { tutorProfileId: profile.id },
    }),
  ]);

  return {
    ok: true as const,
    profile: { id: profile.id },
    planCap,
    activeCount,
    extraActiveSlots,
    totalRows,
  };
}

/**
 * Gate for **creating** a Teaching Profile row.
 * At ACTIVE cap → still ok with forcePaused (Free/extra path).
 * At row cap (10) on Free/extra path → blocked.
 * Pro at ACTIVE cap → cannot create more.
 */
export async function canCreateSubjectProfile(
  userId: string,
  now = new Date(),
): Promise<SubjectProfileGate> {
  const ctx = await loadTutorGateContext(userId, now);
  if (!ctx.ok) return { ok: false, reason: ctx.reason };

  const { profile, planCap, activeCount, extraActiveSlots, totalRows } = ctx;
  const activateCap = resolveCreateTeachingProfileCap({ planCap, activeCount });

  if (
    Number.isFinite(planCap) &&
    planCap < TUTOR_PRO_SUBJECT_PROFILE_CAP &&
    totalRows >= FREE_TEACHING_PROFILE_ROW_CAP
  ) {
    return {
      ok: false,
      reason: `Teaching Profile limit reached (${FREE_TEACHING_PROFILE_ROW_CAP}). Upgrade to Tutor Pro for up to ${TUTOR_PRO_SUBJECT_PROFILE_CAP} active profiles.`,
      activeCount,
      cap: planCap,
      code: UPGRADE_REQUIRED_CODE,
      extraActiveSlots,
      canBuyExtraActive: extraActiveSlots < EXTRA_ACTIVE_SLOT_MAX,
    };
  }

  if (shouldForcePausedTeachingProfileCreate({ planCap, activeCount })) {
    return {
      ok: true,
      profile,
      activeCount,
      cap: planCap,
      forcePaused: true,
    };
  }

  if (activeCount >= activateCap) {
    if (!Number.isFinite(activateCap)) {
      return { ok: false, reason: "Active Teaching Profile limit reached.", activeCount, cap: activateCap };
    }
    return {
      ok: false,
      reason: `Active Teaching Profile limit reached (${activateCap}).`,
      activeCount,
      cap: activateCap,
      code: UPGRADE_REQUIRED_CODE,
      extraActiveSlots,
      canBuyExtraActive: extraActiveSlots < EXTRA_ACTIVE_SLOT_MAX,
    };
  }

  return { ok: true, profile, activeCount, cap: planCap, forcePaused: false };
}

/**
 * Gate for **activating** (or creating as ACTIVE) a Teaching Profile.
 * At cap → upgrade (Extra Active or Tutor Pro).
 */
export async function canActivateSubjectProfile(
  userId: string,
  now = new Date(),
): Promise<SubjectProfileGate> {
  const ctx = await loadTutorGateContext(userId, now);
  if (!ctx.ok) return { ok: false, reason: ctx.reason };

  const { profile, planCap, activeCount, extraActiveSlots } = ctx;
  const cap = resolveCreateTeachingProfileCap({ planCap, activeCount });

  if (activeCount >= cap) {
    if (!Number.isFinite(cap)) {
      return { ok: false, reason: "Active Teaching Profile limit reached.", activeCount, cap };
    }
    if (planCap < TUTOR_PRO_SUBJECT_PROFILE_CAP) {
      return {
        ok: false,
        reason: UPGRADE_FOR_MORE_PROFILES_MESSAGE,
        activeCount,
        cap: planCap,
        code: UPGRADE_REQUIRED_CODE,
        extraActiveSlots,
        canBuyExtraActive: extraActiveSlots < EXTRA_ACTIVE_SLOT_MAX,
      };
    }
    return {
      ok: false,
      reason: `Active Teaching Profile limit reached (${planCap}).`,
      activeCount,
      cap: planCap,
    };
  }

  return { ok: true, profile, activeCount, cap: planCap, extraActiveSlots };
}

/**
 * Pause oldest ACTIVE subject profiles that exceed the tutor's cap.
 * Keeps the most recently updated listings live. No-op when under cap.
 * Never auto-pauses Free/extra path (grandfather).
 */
export async function enforceSubjectProfileCap(
  userId: string,
  now = new Date(),
): Promise<{ paused: number; kept: number; cap: number }> {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return { paused: 0, kept: 0, cap: 0 };

  const cap = await getSubjectProfileActiveCap(userId, now);
  if (!Number.isFinite(cap)) return { paused: 0, kept: 0, cap };

  if (cap < TUTOR_PRO_SUBJECT_PROFILE_CAP) {
    const activeCount = await prisma.subjectProfile.count({
      where: { tutorProfileId: profile.id, status: "ACTIVE" },
    });
    return { paused: 0, kept: activeCount, cap };
  }

  const active = await prisma.subjectProfile.findMany({
    where: { tutorProfileId: profile.id, status: "ACTIVE" },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, subject: true },
  });

  if (active.length <= cap) {
    return { paused: 0, kept: active.length, cap };
  }

  const keep = active.slice(0, cap);
  const pause = active.slice(cap);
  await prisma.subjectProfile.updateMany({
    where: { id: { in: pause.map((row) => row.id) } },
    data: { status: "PAUSED" },
  });
  for (const row of pause) {
    await prisma.tutorAd
      .updateMany({
        where: { tutorProfileId: profile.id, subject: row.subject, status: "ACTIVE" },
        data: { status: "PAUSED" },
      })
      .catch(() => undefined);
  }

  return { paused: pause.length, kept: keep.length, cap };
}

/** Cap enforcement for tutors over their limit (cron / admin). */
export async function enforceAllSubjectProfileCaps(now = new Date()): Promise<{
  tutorsChecked: number;
  profilesPaused: number;
}> {
  const tutors = await prisma.tutorProfile.findMany({
    where: { subjectProfiles: { some: { status: "ACTIVE" } } },
    select: { userId: true },
    take: 500,
  });

  let profilesPaused = 0;
  for (const tutor of tutors) {
    const result = await enforceSubjectProfileCap(tutor.userId, now);
    profilesPaused += result.paused;
  }
  return { tutorsChecked: tutors.length, profilesPaused };
}
