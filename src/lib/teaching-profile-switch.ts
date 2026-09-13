import { prisma } from "@/lib/prisma";
import {
  FREE_PLUS_EXTRA_ACTIVE_CAP,
  getSubjectProfileActiveCap,
  SWITCH_LIMIT_CODE,
} from "@/lib/subject-profile-entitlements";

/** First 14 days after first Teaching Profile: unlimited Active switches on Free/extra. */
export const TEACHING_PROFILE_SWITCH_HONEYMOON_DAYS = 14;
/** After honeymoon, Free/extra tutors may change Active subject this many times per calendar month. */
export const TEACHING_PROFILE_FREE_SWITCHES_PER_MONTH = 4;

export const TEACHING_PROFILE_SWITCH_USAGE_TYPE = "teaching_profile_switch";

function currentMonth(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getTeachingProfileHoneymoonEnd(userId: string): Promise<Date | null> {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: {
      createdAt: true,
      subjectProfiles: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
    },
  });
  if (!profile) return null;
  const start = profile.subjectProfiles[0]?.createdAt || profile.createdAt;
  return new Date(start.getTime() + TEACHING_PROFILE_SWITCH_HONEYMOON_DAYS * 86400000);
}

export async function countTeachingProfileSwitchesThisMonth(
  userId: string,
  now = new Date(),
): Promise<number> {
  return prisma.usageEvent.count({
    where: {
      userId,
      type: TEACHING_PROFILE_SWITCH_USAGE_TYPE,
      month: currentMonth(now),
    },
  });
}

export async function recordTeachingProfileSwitch(userId: string, now = new Date()): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId,
      type: TEACHING_PROFILE_SWITCH_USAGE_TYPE,
      month: currentMonth(now),
    },
  });
}

/**
 * Free/extra path only: after honeymoon, limit PAUSED→ACTIVE switches per month.
 * Pro / Unlimited: always allowed.
 * First-ever activate (0 active → 1) does not consume switch budget.
 */
export async function canSwitchTeachingProfileActive(
  userId: string,
  opts: { previousStatus: string; currentlyActiveCount: number },
  now = new Date(),
): Promise<{ ok: true } | { ok: false; reason: string; code: typeof SWITCH_LIMIT_CODE }> {
  if (opts.previousStatus === "ACTIVE") return { ok: true };
  // Growing from zero Active is not a "switch".
  if (opts.currentlyActiveCount <= 0) return { ok: true };

  const cap = await getSubjectProfileActiveCap(userId, now);
  if (!Number.isFinite(cap) || cap > FREE_PLUS_EXTRA_ACTIVE_CAP) {
    return { ok: true };
  }

  const honeymoonEnd = await getTeachingProfileHoneymoonEnd(userId);
  if (honeymoonEnd && now < honeymoonEnd) return { ok: true };

  const used = await countTeachingProfileSwitchesThisMonth(userId, now);
  if (used >= TEACHING_PROFILE_FREE_SWITCHES_PER_MONTH) {
    return {
      ok: false,
      code: SWITCH_LIMIT_CODE,
      reason: `Free plans can change the live Teaching Profile ${TEACHING_PROFILE_FREE_SWITCHES_PER_MONTH} times per month after setup. Upgrade to Tutor Pro for more flexibility, or try again next month.`,
    };
  }
  return { ok: true };
}
