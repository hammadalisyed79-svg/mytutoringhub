import { prisma } from "@/lib/prisma";
import { FREE_TUTOR_AD_CAP } from "@/lib/types";
import type { Role, SubscriptionPlan } from "@/lib/types";

const ACTIVE = new Set(["ACTIVE", "TRIALING"]);

export async function hasActivePlan(userId: string, plan: SubscriptionPlan) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, plan, status: { in: ["ACTIVE", "TRIALING"] } },
  });
  return Boolean(sub);
}

export async function hasAnyActivePlan(userId: string, plans: SubscriptionPlan[]) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, plan: { in: plans }, status: { in: ["ACTIVE", "TRIALING"] } },
  });
  return Boolean(sub);
}

/** Students need Student Pass; tutors need Tutor Basic (or verified which implies paid presence). */
export async function canMessage(userId: string, role: Role) {
  if (role === "ADMIN") return true;
  if (role === "STUDENT") return hasActivePlan(userId, "STUDENT_PASS");
  if (role === "TUTOR") {
    return hasAnyActivePlan(userId, ["TUTOR_BASIC", "VERIFIED_TUTOR"]);
  }
  return false;
}

export async function canPostAd(userId: string, role: Role) {
  if (role === "ADMIN") return true;
  if (role === "STUDENT") return hasActivePlan(userId, "STUDENT_PASS");
  return false;
}

export async function tutorAdLimit(userId: string) {
  if (await hasActivePlan(userId, "UNLIMITED_ADS")) return Number.POSITIVE_INFINITY;
  return FREE_TUTOR_AD_CAP;
}

export async function canCreateTutorAd(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) return { ok: false as const, reason: "Create your tutor profile first" };
  if (!(await hasAnyActivePlan(userId, ["TUTOR_BASIC", "VERIFIED_TUTOR", "HIGHLIGHTED_AD"]))) {
    return { ok: false as const, reason: "Tutor Basic is required to publish ads" };
  }
  const limit = await tutorAdLimit(userId);
  const count = await prisma.tutorAd.count({
    where: { tutorProfileId: profile.id, status: "ACTIVE" },
  });
  if (count >= limit) {
    return {
      ok: false as const,
      reason: `Active ad limit reached (${FREE_TUTOR_AD_CAP}). Upgrade to Unlimited Ads.`,
    };
  }
  return { ok: true as const, profile };
}

/** Apply paid plan side-effects: listing active, highlight/boost windows, verified entitlement. */
export async function syncTutorBadges(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    include: { ads: true },
  });
  if (!profile) return;

  const subs = await prisma.subscription.findMany({
    where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
  });
  const plans = new Set(subs.map((s) => s.plan));
  const now = new Date();
  const periodEnd =
    subs.find((s) => s.plan === "HIGHLIGHTED_AD")?.currentPeriodEnd ||
    (plans.has("HIGHLIGHTED_AD") ? new Date(now.getTime() + 30 * 86400000) : null);
  const boostEnd =
    subs.find((s) => s.plan === "AD_BOOST")?.currentPeriodEnd ||
    (plans.has("AD_BOOST") ? new Date(now.getTime() + 30 * 86400000) : null);

  // Do not clear admin-approved verified when Verified plan lapses — only set true from plan.
  const verified = profile.verified || plans.has("VERIFIED_TUTOR");

  await prisma.tutorProfile.update({
    where: { id: profile.id },
    data: {
      verified,
      highlighted: Boolean(periodEnd && periodEnd > now) || plans.has("HIGHLIGHTED_AD"),
      highlightedUntil: periodEnd && periodEnd > now ? periodEnd : profile.highlightedUntil,
      boostUntil: boostEnd && boostEnd > now ? boostEnd : profile.boostUntil,
      active:
        plans.has("TUTOR_BASIC") ||
        plans.has("VERIFIED_TUTOR") ||
        plans.has("HIGHLIGHTED_AD") ||
        plans.has("AD_BOOST") ||
        plans.has("UNLIMITED_ADS"),
    },
  });

  if (periodEnd && periodEnd > now) {
    await prisma.tutorAd.updateMany({
      where: { tutorProfileId: profile.id, status: "ACTIVE" },
      data: { highlightedUntil: periodEnd },
    });
  }
  if (boostEnd && boostEnd > now) {
    await prisma.tutorAd.updateMany({
      where: { tutorProfileId: profile.id, status: "ACTIVE" },
      data: { boostUntil: boostEnd },
    });
  }
}

export function isSubscriptionActive(status: string) {
  return ACTIVE.has(status);
}

export function isBoostActive(boostUntil: Date | null | undefined, now = new Date()) {
  if (!boostUntil) return false;
  if (boostUntil <= now) return false;
  // Rolling visibility: every 4 days within the boost window, treat as boosted for 1 day.
  const ms = boostUntil.getTime() - now.getTime();
  const daysLeft = Math.floor(ms / 86400000);
  return daysLeft % 4 === 0 || daysLeft % 4 === 3;
}

export function isHighlightActive(until: Date | null | undefined, flagged: boolean, now = new Date()) {
  if (until && until > now) return true;
  return flagged;
}
