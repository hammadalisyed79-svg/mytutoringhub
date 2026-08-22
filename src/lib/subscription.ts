import { prisma } from "@/lib/prisma";
import { FREE_TUTOR_AD_CAP } from "@/lib/types";
import type { Role, SubscriptionPlan } from "@/lib/types";

const ACTIVE = new Set(["ACTIVE", "TRIALING"]);

const STUDENT_MESSAGING_PLANS: SubscriptionPlan[] = ["STUDENT_PASS", "STUDENT_PRO"];
const TUTOR_PAID_PLANS: SubscriptionPlan[] = [
  "TUTOR_BASIC",
  "VERIFIED_TUTOR",
  "HIGHLIGHTED_AD",
  "AD_BOOST",
  "UNLIMITED_ADS",
];

export async function hasActivePlan(userId: string, plan: SubscriptionPlan) {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      plan,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
  });
  return Boolean(sub);
}

export async function hasAnyActivePlan(userId: string, plans: SubscriptionPlan[]) {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: { in: plans },
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
  });
  return Boolean(sub);
}

/** Email-verified users may message; monthly free limits are enforced in plan-limits / messages API. */
export async function canMessage(userId: string, role: Role) {
  if (role === "ADMIN") return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true, emailVerified: true },
  });
  if (!user || user.suspended || !user.emailVerified) return false;
  return role === "STUDENT" || role === "TUTOR";
}

/** Reply in an existing thread. Tutors may answer inbound student messages even before email verification. */
export async function canReplyInConversation(userId: string, role: Role, conversationId: string) {
  if (role === "ADMIN") return true;
  if (await canMessage(userId, role)) return true;

  if (role !== "TUTOR") return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true },
  });
  if (!user || user.suspended) return false;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userAId: true, userBId: true },
  });
  if (!conversation) return false;
  if (conversation.userAId !== userId && conversation.userBId !== userId) return false;

  const otherId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
  const inbound = await prisma.message.findFirst({
    where: { conversationId, senderId: otherId },
    select: { id: true },
  });
  return Boolean(inbound);
}

/** Recipient does not need a paid plan. Listed tutors and any non-suspended student can receive. */
export async function canReceiveMessages(userId: string, role: Role) {
  if (role === "ADMIN") return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      suspended: true,
      role: true,
      tutorProfile: { select: { active: true } },
    },
  });
  if (!user || user.suspended) return false;
  if (role === "TUTOR" || user.role === "TUTOR") {
    return Boolean(user.tutorProfile?.active);
  }
  return true;
}

export async function hasStudentMessagingPass(userId: string) {
  return hasAnyActivePlan(userId, STUDENT_MESSAGING_PLANS);
}

export async function hasPaidTutorPlan(userId: string) {
  return hasAnyActivePlan(userId, TUTOR_PAID_PLANS);
}

/** Student Pro unlocks AI; tutors/admins keep access with verified email (checked by caller). */
export async function canUseStudyAssistant(userId: string, role: Role) {
  if (role === "ADMIN" || role === "TUTOR") return true;
  if (role === "STUDENT") return hasActivePlan(userId, "STUDENT_PRO");
  return false;
}

export async function canPostAd(userId: string, role: Role) {
  if (role === "ADMIN") return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true, emailVerified: true },
  });
  if (!user || user.suspended || !user.emailVerified) return false;
  if (role === "STUDENT") return hasStudentMessagingPass(userId);
  return false;
}

export async function tutorAdLimit(userId: string) {
  if (await hasActivePlan(userId, "UNLIMITED_ADS")) return Number.POSITIVE_INFINITY;
  return FREE_TUTOR_AD_CAP;
}

export async function canCreateTutorAd(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true, emailVerified: true, role: true },
  });
  if (!user) return { ok: false as const, reason: "Create your tutor profile first" };
  if (user.suspended) return { ok: false as const, reason: "Account suspended" };
  if (user.role !== "ADMIN" && !user.emailVerified) {
    return { ok: false as const, reason: "Verify your email to publish ads" };
  }
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

/** Map active tutor subscriptions to search priority: Free=0, Basic=1, Verified/Elite=2. */
export function computeTutorPlanTier(plans: Set<string>): number {
  if (plans.has("VERIFIED_TUTOR")) return 2;
  if (
    plans.has("TUTOR_BASIC") ||
    plans.has("HIGHLIGHTED_AD") ||
    plans.has("AD_BOOST") ||
    plans.has("UNLIMITED_ADS")
  ) {
    return 1;
  }
  return 0;
}

/**
 * Minimum for free search listing: subjects, headline, bio, and a profile photo.
 */
export function isTutorProfileListable(profile: {
  subjects?: string | null;
  headline?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
}): boolean {
  const hasSubjects = Boolean(profile.subjects?.trim());
  const hasHeadline = Boolean(profile.headline && profile.headline.trim().length >= 8);
  const hasPhoto = Boolean(profile.photoUrl?.trim());
  const hasBio = Boolean(profile.bio && profile.bio.trim().length >= 40);
  return hasSubjects && hasHeadline && hasPhoto && hasBio;
}

/** Apply paid plan side-effects: highlight/boost windows, verified entitlement, planTier.
 * Free tutors with a complete-enough profile stay `active` for search (paid plans add priority). */
export async function syncTutorBadges(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    include: { ads: true },
  });
  if (!profile) return;

  const now = new Date();
  const subs = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
  });
  const plans = new Set(subs.map((s) => s.plan));
  const nowMs = now.getTime();
  const maxPeriodEnd = (planId: string) =>
    subs
      .filter((s) => s.plan === planId && s.currentPeriodEnd && s.currentPeriodEnd > now)
      .reduce<Date | null>((best, s) => {
        const end = s.currentPeriodEnd!;
        return !best || end.getTime() > best.getTime() ? end : best;
      }, null);

  const periodEnd =
    maxPeriodEnd("HIGHLIGHTED_AD") ||
    (plans.has("HIGHLIGHTED_AD") ? new Date(nowMs + 30 * 86400000) : null);
  const boostEnd =
    maxPeriodEnd("AD_BOOST") ||
    (plans.has("AD_BOOST") ? new Date(nowMs + 30 * 86400000) : null);

  const highlightUntil =
    periodEnd && profile.highlightedUntil && profile.highlightedUntil > periodEnd
      ? profile.highlightedUntil
      : periodEnd && periodEnd > now
        ? periodEnd
        : profile.highlightedUntil;
  const boostUntil =
    boostEnd && profile.boostUntil && profile.boostUntil > boostEnd
      ? profile.boostUntil
      : boostEnd && boostEnd > now
        ? boostEnd
        : profile.boostUntil;

  // Verified badge is granted only by admin document review (verify_approve / set_verified).
  const verified = profile.verified;
  const hasPaidListing =
    plans.has("TUTOR_BASIC") ||
    plans.has("VERIFIED_TUTOR") ||
    plans.has("HIGHLIGHTED_AD") ||
    plans.has("AD_BOOST") ||
    plans.has("UNLIMITED_ADS");
  const planTier = computeTutorPlanTier(plans);
  const listable = isTutorProfileListable(profile);

  await prisma.tutorProfile.update({
    where: { id: profile.id },
    data: {
      verified,
      planTier,
      highlighted: Boolean(highlightUntil && highlightUntil > now) || plans.has("HIGHLIGHTED_AD"),
      highlightedUntil: highlightUntil,
      boostUntil,
      active: profile.forceActive || hasPaidListing || listable,
    },
  });

  if (highlightUntil && highlightUntil > now) {
    await prisma.tutorAd.updateMany({
      where: { tutorProfileId: profile.id, status: "ACTIVE" },
      data: { highlightedUntil: highlightUntil },
    });
  }
  if (boostUntil && boostUntil > now) {
    await prisma.tutorAd.updateMany({
      where: { tutorProfileId: profile.id, status: "ACTIVE" },
      data: { boostUntil },
    });
  }
}

export function isSubscriptionActive(status: string) {
  return ACTIVE.has(status);
}

/** One row per plan: keep the active/trialing subscription with the latest period end. */
export function uniqueVisibleSubscriptions<T extends {
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
}>(subs: T[]): T[] {
  const best = new Map<string, T>();
  for (const sub of subs) {
    if (!ACTIVE.has(sub.status)) continue;
    const prev = best.get(sub.plan);
    if (!prev) {
      best.set(sub.plan, sub);
      continue;
    }
    const prevEnd = prev.currentPeriodEnd?.getTime() ?? 0;
    const nextEnd = sub.currentPeriodEnd?.getTime() ?? 0;
    if (nextEnd >= prevEnd) best.set(sub.plan, sub);
  }
  return [...best.values()];
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
