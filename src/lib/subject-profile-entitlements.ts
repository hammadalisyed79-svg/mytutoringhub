import { endOfPromoDay, formatPromoUntil } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/types";

/** Inclusive promo end — unlimited subject profiles while active. */
export const SUBJECT_PROFILE_PROMO_UNTIL = "2026-09-30";

/** Free active subject profiles after the promo ends. */
export const FREE_SUBJECT_PROFILES_AFTER_PROMO = 1;

/**
 * With Extra Profile Ads or Tutor Basic, tutors may run this many active subject
 * profiles after the promo. Verified / Boost / Highlight do not unlock extra slots.
 */
export const PAID_SUBJECT_PROFILE_CAP = 3;

const PROFILE_PACK_PLANS: SubscriptionPlan[] = ["TUTOR_BASIC", "EXTRA_PROFILE_ADS"];

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

export function isSubjectProfilePromoActive(now = new Date()): boolean {
  const ends = endOfPromoDay(SUBJECT_PROFILE_PROMO_UNTIL);
  return Boolean(ends && now.getTime() <= ends.getTime());
}

export function subjectProfilePromoLabel(now = new Date()): string {
  if (!isSubjectProfilePromoActive(now)) return "";
  return `Unlimited subject profiles free until ${formatPromoUntil(SUBJECT_PROFILE_PROMO_UNTIL)}`;
}

/**
 * Resolve how many ACTIVE subject profiles a tutor may run.
 * Pure helper for tests — pass plan flags explicitly.
 */
export function resolveSubjectProfileActiveCap(opts: {
  now?: Date;
  unlimitedProfiles: boolean;
  hasProfilePack: boolean;
}): number {
  if (opts.unlimitedProfiles) return Number.POSITIVE_INFINITY;
  if (isSubjectProfilePromoActive(opts.now)) return Number.POSITIVE_INFINITY;
  if (opts.hasProfilePack) return PAID_SUBJECT_PROFILE_CAP;
  return FREE_SUBJECT_PROFILES_AFTER_PROMO;
}

export async function getSubjectProfileActiveCap(userId: string, now = new Date()): Promise<number> {
  const [unlimited, pack] = await Promise.all([
    hasPlan(userId, "UNLIMITED_ADS"),
    hasAnyPlan(userId, PROFILE_PACK_PLANS),
  ]);
  return resolveSubjectProfileActiveCap({
    now,
    unlimitedProfiles: unlimited,
    hasProfilePack: pack,
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
 * Promo: unlimited free. After promo: 1 free; Extra Profile Ads or Tutor Basic → up to 3;
 * Unlimited Profiles → unlimited.
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
    return { ok: false, reason: "Switch to a tutor account to publish subject profiles" };
  }
  if (user.role !== "ADMIN" && !user.emailVerified) {
    return { ok: false, reason: "Verify your email to publish subject profiles" };
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
    if (isSubjectProfilePromoActive(now)) {
      return {
        ok: false,
        reason: "Active subject profile limit reached.",
        activeCount,
        cap,
      };
    }
    if (cap <= FREE_SUBJECT_PROFILES_AFTER_PROMO) {
      return {
        ok: false,
        reason:
          "Your free plan includes 1 active subject profile. Upgrade to Extra Profile Ads, Tutor Basic, or Unlimited Profiles to add more.",
        activeCount,
        cap,
      };
    }
    return {
      ok: false,
      reason: `Active subject profile limit reached (${cap}). Upgrade to Unlimited Profiles for more.`,
      activeCount,
      cap,
    };
  }

  return { ok: true, profile: { id: profile.id }, activeCount, cap };
}

/**
 * After the promo, pause oldest ACTIVE subject profiles that exceed the tutor's cap.
 * Keeps the most recently updated listings live. No-op during promo or when under cap.
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

/** Run cap enforcement for all tutors over their limit (post-promo cron). */
export async function enforceAllSubjectProfileCaps(now = new Date()): Promise<{
  tutorsChecked: number;
  profilesPaused: number;
}> {
  if (isSubjectProfilePromoActive(now)) {
    return { tutorsChecked: 0, profilesPaused: 0 };
  }

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
