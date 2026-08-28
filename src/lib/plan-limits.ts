import { prisma } from "@/lib/prisma";
import {
  hasActivePlan,
  hasAnyActivePlan,
  hasPaidTutorPlan,
  hasStudentMessagingPass,
} from "@/lib/subscription";
import type { Role, SubscriptionPlan } from "@/lib/types";

export const TUTOR_FREE_REVEAL_LIMIT = 3;
export const STUDENT_FREE_CONTACT_LIMIT = 3;
export const STUDENT_PASS_PAPER_DOWNLOADS = 10;
export const REFERRAL_CONTACT_BONUS = 1;

/** Returns the user's current plan slug — reads Subscription table, falls back to "free". */
export async function getUserPlan(userId: string): Promise<string> {
  try {
    const now = new Date();
    const sub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIALING"] },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) return "free";
    return sub.plan.toLowerCase();
  } catch {
    return "free";
  }
}

/** Returns the current month string in "YYYY-MM" format. */
function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getReferralContactBonus(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralBonusContacts: true },
    });
    return Math.max(0, user?.referralBonusContacts ?? 0);
  } catch {
    return 0;
  }
}

/** Apply referral bonus to new user and referrer (once each). */
export async function applyReferralSignup(newUserId: string, referrerId: string): Promise<void> {
  if (!referrerId || referrerId === newUserId) return;
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { id: true, role: true, suspended: true },
  });
  if (!referrer || referrer.suspended) return;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: newUserId },
      data: { referralBonusContacts: { increment: REFERRAL_CONTACT_BONUS } },
    }),
    prisma.user.update({
      where: { id: referrerId },
      data: { referralBonusContacts: { increment: REFERRAL_CONTACT_BONUS } },
    }),
  ]);
}

/** Returns monthly usage count for a user and event type. */
export async function getMonthlyUsage(
  userId: string,
  type: "enquiry_reveal" | "tutor_contact" | "paper_download",
): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await (prisma as any).usageEvent.count({
      where: { userId, type, month: currentMonth() },
    });
    return count as number;
  } catch {
    return 0;
  }
}

/** Check if a user can perform an action given their plan limits. */
export async function canPerformAction(
  userId: string,
  action: "enquiry_reveal" | "tutor_contact",
): Promise<{ allowed: boolean; limit: number; used: number; plan: string }> {
  const plan = await getUserPlan(userId);
  const used = await getMonthlyUsage(userId, action);

  if (action === "enquiry_reveal") {
    const isPaid = await hasPaidTutorPlan(userId);
    const limit = isPaid ? Infinity : TUTOR_FREE_REVEAL_LIMIT;
    return {
      allowed: isPaid || used < TUTOR_FREE_REVEAL_LIMIT,
      limit: isPaid ? -1 : TUTOR_FREE_REVEAL_LIMIT,
      used,
      plan,
    };
  }

  if (action === "tutor_contact") {
    const isPaid = await hasStudentMessagingPass(userId);
    const limit = isPaid ? Infinity : STUDENT_FREE_CONTACT_LIMIT;
    return {
      allowed: isPaid || used < limit,
      limit: isPaid ? -1 : limit,
      used,
      plan,
    };
  }

  return { allowed: false, limit: 0, used: 0, plan };
}

/** Student Pass: 10 paper downloads/month. Student Pro: unlimited. */
export async function canDownloadPastPaper(userId: string): Promise<{
  allowed: boolean;
  limit: number;
  used: number;
  includedInPlan: boolean;
}> {
  const hasPro = await hasActivePlan(userId, "STUDENT_PRO");
  if (hasPro) {
    return { allowed: true, limit: -1, used: 0, includedInPlan: true };
  }
  const hasPass = await hasStudentMessagingPass(userId);
  if (!hasPass) {
    return { allowed: false, limit: 0, used: 0, includedInPlan: false };
  }
  const used = await getMonthlyUsage(userId, "paper_download");
  return {
    allowed: used < STUDENT_PASS_PAPER_DOWNLOADS,
    limit: STUDENT_PASS_PAPER_DOWNLOADS,
    used,
    includedInPlan: true,
  };
}

/** Record a usage event. Silently no-ops if the UsageEvent table doesn't exist yet. */
export async function recordUsage(
  userId: string,
  type: "enquiry_reveal" | "tutor_contact" | "paper_download",
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).usageEvent.create({
      data: { userId, type, month: currentMonth() },
    });
  } catch {
    // Table may not be migrated yet — ignore
  }
}

export type PlanDashboardSummary = {
  planName: string;
  planTier: "free" | "pro" | "elite";
  usageUsed: number;
  usageLimit: number;
  usageLabel: string;
  renewsOn: string | null;
  upgradeHint: string;
};

/** Usage meters + labels for student/tutor plan dashboard pages. */
export async function getPlanDashboardSummary(
  userId: string,
  role: Role,
): Promise<PlanDashboardSummary> {
  const now = new Date();
  const subs = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
    orderBy: { currentPeriodEnd: "desc" },
  });
  const renewsOn =
    subs.find((s) => s.currentPeriodEnd)?.currentPeriodEnd?.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? null;

  if (role === "STUDENT") {
    const check = await canPerformAction(userId, "tutor_contact");
    const hasPro = await hasActivePlan(userId, "STUDENT_PRO");
    const hasPass = hasPro || (await hasActivePlan(userId, "STUDENT_PASS"));
    return {
      planName: hasPro ? "Student Pro" : hasPass ? "Student Pass" : "Free",
      planTier: hasPro ? "elite" : hasPass ? "pro" : "free",
      usageUsed: check.used,
      usageLimit: check.limit,
      usageLabel: "tutor contacts this month",
      renewsOn: hasPass ? renewsOn : null,
      upgradeHint: hasPro
        ? "You have unlimited contacts and the AI study assistant."
        : hasPass
          ? "Upgrade to Student Pro for unlimited past papers and the AI study assistant."
          : `Free includes ${STUDENT_FREE_CONTACT_LIMIT} new tutor contacts per month. Earn Hub Points from referrals. Upgrade for unlimited messaging and past papers.`,
    };
  }

  const check = await canPerformAction(userId, "enquiry_reveal");
  const hasElite = await hasActivePlan(userId, "VERIFIED_TUTOR");
  const hasBasic =
    hasElite ||
    (await hasAnyActivePlan(userId, [
      "TUTOR_BASIC",
      "HIGHLIGHTED_AD",
      "AD_BOOST",
      "EXTRA_PROFILE_ADS",
      "UNLIMITED_ADS",
    ] as SubscriptionPlan[]));
  return {
    planName: hasElite ? "Verified Tutor" : hasBasic ? "Tutor plan" : "Free listing",
    planTier: hasElite ? "elite" : hasBasic ? "pro" : "free",
    usageUsed: check.used,
    usageLimit: check.limit,
    usageLabel: "student contacts this month",
    renewsOn: hasBasic ? renewsOn : null,
    upgradeHint: hasBasic
      ? "Unlimited student contact when you initiate. Free accounts keep 1 subject profile after the launch promo; paid packs unlock more."
      : `Complete your profile to appear in search for free. Free listed tutors receive messages anytime and get ${TUTOR_FREE_REVEAL_LIMIT} student contacts/month. Extra Profile Ads or Tutor Basic unlock more subject profiles and unlimited contacts.`,
  };
}
