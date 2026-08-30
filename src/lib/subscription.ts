import { isTutorProfileComplete } from "@/lib/tutor-profile-completion";
import { isSuspiciousDisplayName } from "@/lib/display-name";
import { prisma } from "@/lib/prisma";
import { syncTutorTrustBadge } from "@/lib/tutor-badges";
import type { Role, SubscriptionPlan } from "@/lib/types";

const ACTIVE = new Set(["ACTIVE", "TRIALING"]);

const STUDENT_MESSAGING_PLANS: SubscriptionPlan[] = ["STUDENT_PASS", "STUDENT_PRO"];

/** Plans that unlock unlimited enquiry reveals (when tutor messages students first). */
const TUTOR_UNLIMITED_REVEAL_PLANS: SubscriptionPlan[] = [
  "TUTOR_BASIC",
  "EXTRA_PROFILE_ADS",
  "UNLIMITED_ADS",
];

/** Any paid tutor SKU (for dashboards / “has a paid add-on” checks — not for reveals/tier). */
const TUTOR_ANY_PAID_PLANS: SubscriptionPlan[] = [
  "TUTOR_BASIC",
  "VERIFIED_TUTOR",
  "HIGHLIGHTED_AD",
  "AD_BOOST",
  "EXTRA_PROFILE_ADS",
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

/** Unlimited enquiry reveals — Tutor Pro or profile-pack plans only (not Boost/Highlight). */
export async function hasPaidTutorPlan(userId: string) {
  return hasAnyActivePlan(userId, TUTOR_UNLIMITED_REVEAL_PLANS);
}

/** True if the tutor has any paid add-on (including Boost/Highlight/Verified). */
export async function hasAnyPaidTutorSku(userId: string) {
  return hasAnyActivePlan(userId, TUTOR_ANY_PAID_PLANS);
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
  const { getSubjectProfileActiveCap } = await import("@/lib/subject-profile-entitlements");
  return getSubjectProfileActiveCap(userId);
}

export async function canCreateTutorAd(userId: string) {
  const { canCreateSubjectProfile } = await import("@/lib/subject-profile-entitlements");
  const gate = await canCreateSubjectProfile(userId);
  if (!gate.ok) return { ok: false as const, reason: gate.reason };
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) return { ok: false as const, reason: "Create your tutor profile first" };
  return { ok: true as const, profile };
}

/**
 * Ranking tier from paid growth plan only.
 * Identity Verified (earned badge) is applied separately in syncTutorBadges —
 * Priority Verification Review SKU never buys tier/badge.
 * Boost / Highlight / Extra Profiles do not buy ranking tier.
 */
export function computeTutorPlanTier(
  plans: Set<string>,
  opts?: { identityVerified?: boolean },
): number {
  if (opts?.identityVerified) return 2;
  if (plans.has("TUTOR_BASIC")) return 1;
  return 0;
}

/**
 * Full profile completion required for free search listing (all * fields including highest qualification).
 * Paid plans add priority only — they do not bypass completeness (unless admin forceActive).
 */
export function isTutorProfileListable(
  profile: {
    subjects?: string | null;
    headline?: string | null;
    photoUrl?: string | null;
    bio?: string | null;
    country?: string | null;
    location?: string | null;
    hourlyRate?: number | null;
    online?: boolean;
    inPerson?: boolean;
    qualifications?: string | null;
    hasValidListingRate?: boolean;
    hasValidTeachingProfile?: boolean;
    subjectProfiles?: Array<{
      status?: string | null;
      subject?: string | null;
      rate?: number | null;
      online?: boolean | null;
      inPerson?: boolean | null;
    }> | null;
  },
  name?: string | null,
): boolean {
  if (isSuspiciousDisplayName(name)) return false;
  return isTutorProfileComplete({
    name,
    photoUrl: profile.photoUrl,
    headline: profile.headline,
    bio: profile.bio,
    country: profile.country,
    location: profile.location,
    subjects: profile.subjects,
    hourlyRate: profile.hourlyRate,
    hasValidListingRate: profile.hasValidListingRate,
    hasValidTeachingProfile: profile.hasValidTeachingProfile,
    subjectProfiles: profile.subjectProfiles,
    online: profile.online,
    inPerson: profile.inPerson,
    qualifications: profile.qualifications,
  });
}

/** Apply paid plan side-effects: highlight/boost windows, verified entitlement, planTier.
 * Free tutors with a complete-enough profile stay `active` for search (paid plans add priority). */
export async function syncTutorBadges(userId: string) {
  const [profile, user] = await Promise.all([
    prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        ads: true,
        subjectProfiles: {
          where: { status: "ACTIVE" },
          select: { status: true, subject: true, rate: true, online: true, inPerson: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, emailVerified: true },
    }),
  ]);
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
  const planTier = computeTutorPlanTier(plans, { identityVerified: verified });
  const listable =
    Boolean(user?.emailVerified) &&
    isTutorProfileListable({ ...profile, subjectProfiles: profile.subjectProfiles }, user?.name);

  await prisma.tutorProfile.update({
    where: { id: profile.id },
    data: {
      verified,
      planTier,
      highlighted: Boolean(highlightUntil && highlightUntil > now) || plans.has("HIGHLIGHTED_AD"),
      highlightedUntil: highlightUntil,
      boostUntil,
      // Complete + email-verified profiles list free; paid plans only affect ranking/ads.
      // Admin forceActive can restore visibility for edge cases without deleting accounts.
      active: profile.forceActive || listable,
    },
  });

  await syncTutorTrustBadge(profile.id);

  // Boost / Highlight are purchased per subject profile (Phase D). Do not cascade
  // account-level windows onto every ACTIVE listing — checkout applies to one listing.

  const { enforceSubjectProfileCap } = await import("@/lib/subject-profile-entitlements");
  await enforceSubjectProfileCap(userId).catch((err) =>
    console.error("[subject-profiles] cap enforce failed", userId, err),
  );
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
