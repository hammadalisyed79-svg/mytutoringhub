import { endOfPromoDay, formatPromoUntil } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/types";

/** Inclusive promo end — unlimited subject profiles while active. */
export const SUBJECT_PROFILE_PROMO_UNTIL = "2026-09-30";

/** Free active subject profiles after the promo ends. */
export const FREE_SUBJECT_PROFILES_AFTER_PROMO = 1;

/**
 * With Extra Profile Ads (or Tutor Basic / Verified / Highlight), tutors may run
 * this many active subject profiles after the promo.
 */
export const PAID_SUBJECT_PROFILE_CAP = 3;

const PROFILE_PACK_PLANS: SubscriptionPlan[] = [
  "TUTOR_BASIC",
  "VERIFIED_TUTOR",
  "HIGHLIGHTED_AD",
  "EXTRA_PROFILE_ADS",
];

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
 * Resolve how many ACTIVE subject profiles (TutorAd rows today) a tutor may run.
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
  return prisma.tutorAd.count({
    where: { tutorProfileId: profile.id, status: "ACTIVE" },
  });
}

export type SubjectProfileGate =
  | { ok: true; profile: { id: string }; activeCount: number; cap: number }
  | { ok: false; reason: string; activeCount?: number; cap?: number };

/**
 * Phase A gate for creating/reactivating a subject profile (TutorAd).
 * Promo: unlimited free. After promo: 1 free; Extra/Basic/Verified/Highlight → up to 3;
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
    prisma.tutorAd.count({
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
