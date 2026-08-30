import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/types";

/**
 * Marketplace V2 teaching-listing caps (canonical).
 * Free = 3 active listings; Tutor Pro (TUTOR_BASIC) = 10.
 * Legacy EXTRA_PROFILE_ADS maps to Pro cap (grandfather).
 * Legacy UNLIMITED_ADS keeps unlimited (grandfather).
 */
export const FREE_SUBJECT_PROFILES = 3;
export const TUTOR_PRO_SUBJECT_PROFILE_CAP = 10;

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

/** @deprecated Listing caps no longer use a promo window. Always false. */
export function isSubjectProfilePromoActive(_now = new Date()): boolean {
  return false;
}

export function subjectProfilePromoLabel(_now = new Date()): string {
  return `Free plan includes ${FREE_SUBJECT_PROFILES} active Teaching Profiles. Tutor Pro unlocks up to ${TUTOR_PRO_SUBJECT_PROFILE_CAP}.`;
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
}): number {
  if (opts.unlimitedProfiles) return Number.POSITIVE_INFINITY;
  if (opts.hasTutorPro || opts.hasProfilePack) return TUTOR_PRO_SUBJECT_PROFILE_CAP;
  return FREE_SUBJECT_PROFILES;
}

export async function getSubjectProfileActiveCap(userId: string, _now = new Date()): Promise<number> {
  const [unlimited, tutorPro] = await Promise.all([
    hasPlan(userId, "UNLIMITED_ADS"),
    hasAnyPlan(userId, TUTOR_PRO_PLANS),
  ]);
  return resolveSubjectProfileActiveCap({
    unlimitedProfiles: unlimited,
    hasTutorPro: tutorPro,
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

export type SubjectProfileGate =
  | { ok: true; profile: { id: string }; activeCount: number; cap: number }
  | { ok: false; reason: string; activeCount?: number; cap?: number };

/**
 * Gate for creating/reactivating a SubjectProfile.
 * Free → 3; Tutor Pro / Extra Profile Ads (legacy) → 10; Unlimited Profiles (legacy) → ∞.
 */
export async function canCreateSubjectProfile(
  userId: string,
  now = new Date(),
): Promise<SubjectProfileGate> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true, emailVerified: true, role: true },
  });
  if (!user) return { ok: false, reason: "Create your tutor profile first" };
  if (user.suspended) return { ok: false, reason: "Account suspended" };
  if (user.role !== "ADMIN" && user.role !== "TUTOR") {
    return { ok: false, reason: "Switch to a tutor account to publish Teaching Profiles" };
  }
  if (user.role !== "ADMIN" && !user.emailVerified) {
    return { ok: false, reason: "Verify your email to publish Teaching Profiles" };
  }

  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) return { ok: false, reason: "Create your tutor profile first" };

  const [cap, activeCount] = await Promise.all([
    getSubjectProfileActiveCap(userId, now),
    prisma.subjectProfile.count({
      where: { tutorProfileId: profile.id, status: "ACTIVE" },
    }),
  ]);

  if (activeCount >= cap) {
    if (!Number.isFinite(cap)) {
      return { ok: false, reason: "Active Teaching Profile limit reached.", activeCount, cap };
    }
    if (cap <= FREE_SUBJECT_PROFILES) {
      return {
        ok: false,
        reason: `Free plan includes ${FREE_SUBJECT_PROFILES} active Teaching Profiles. Upgrade to Tutor Pro for up to ${TUTOR_PRO_SUBJECT_PROFILE_CAP}. Listing Boost does not add a slot.`,
        activeCount,
        cap,
      };
    }
    return {
      ok: false,
      reason: `Active Teaching Profile limit reached (${cap}). Legacy Unlimited Profiles holders keep unlimited profiles.`,
      activeCount,
      cap,
    };
  }

  return { ok: true, profile: { id: profile.id }, activeCount, cap };
}

/**
 * Pause oldest ACTIVE subject profiles that exceed the tutor's cap.
 * Keeps the most recently updated listings live. No-op when under cap.
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
