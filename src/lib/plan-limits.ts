import { prisma } from "@/lib/prisma";
import {
  hasActivePlan,
  hasAnyActivePlan,
  hasPaidTutorPlan,
  hasStudentMessagingPass,
} from "@/lib/subscription";
import type { Role, SubscriptionPlan } from "@/lib/types";

export const TUTOR_FREE_REVEAL_LIMIT = 5;
export const STUDENT_FREE_CONTACT_LIMIT = 3;

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

/** Returns monthly usage count for a user and event type. */
export async function getMonthlyUsage(
  userId: string,
  type: "enquiry_reveal" | "tutor_contact",
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
      allowed: isPaid || used < STUDENT_FREE_CONTACT_LIMIT,
      limit: isPaid ? -1 : STUDENT_FREE_CONTACT_LIMIT,
      used,
      plan,
    };
  }

  return { allowed: false, limit: 0, used: 0, plan };
}

/** Record a usage event. Silently no-ops if the UsageEvent table doesn't exist yet. */
export async function recordUsage(
  userId: string,
  type: "enquiry_reveal" | "tutor_contact",
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
          ? "Upgrade to Student Pro for the AI study assistant."
          : `Free includes ${STUDENT_FREE_CONTACT_LIMIT} new tutor contacts per month. Upgrade for unlimited messaging.`,
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
      "UNLIMITED_ADS",
    ] as SubscriptionPlan[]));
  return {
    planName: hasElite ? "Verified Tutor" : hasBasic ? "Tutor Basic" : "Free",
    planTier: hasElite ? "elite" : hasBasic ? "pro" : "free",
    usageUsed: check.used,
    usageLimit: check.limit,
    usageLabel: "enquiry reveals this month",
    renewsOn: hasBasic ? renewsOn : null,
    upgradeHint: hasBasic
      ? "Unlimited student contact when you initiate. Listed tutors always receive messages."
      : `Free listed tutors receive messages anytime and get ${TUTOR_FREE_REVEAL_LIMIT} enquiry reveals/month when contacting students.`,
  };
}
