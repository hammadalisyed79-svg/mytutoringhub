import { prisma } from "@/lib/prisma";

const TUTOR_FREE_REVEAL_LIMIT = 5;
const STUDENT_FREE_CONTACT_LIMIT = 3;

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
    const isPaid =
      plan.includes("tutor_pro") ||
      plan.includes("tutor_elite") ||
      plan.includes("verified_tutor") ||
      plan.includes("tutor_basic") ||
      plan === "pro" ||
      plan === "elite";
    const limit = isPaid ? Infinity : TUTOR_FREE_REVEAL_LIMIT;
    return { allowed: isPaid || used < TUTOR_FREE_REVEAL_LIMIT, limit: isPaid ? -1 : TUTOR_FREE_REVEAL_LIMIT, used, plan };
  }

  if (action === "tutor_contact") {
    const isPaid =
      plan.includes("student_pass") ||
      plan.includes("student_plus") ||
      plan.includes("student_pro") ||
      plan === "plus" ||
      plan === "pro";
    const limit = isPaid ? Infinity : STUDENT_FREE_CONTACT_LIMIT;
    return { allowed: isPaid || used < STUDENT_FREE_CONTACT_LIMIT, limit: isPaid ? -1 : STUDENT_FREE_CONTACT_LIMIT, used, plan };
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
