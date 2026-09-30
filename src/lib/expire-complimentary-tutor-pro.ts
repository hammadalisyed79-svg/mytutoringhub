/**
 * Expire unpaid Launch-offer / seed Tutor Pro grants after the hard end.
 * Optionally pause excess ACTIVE Teaching Profiles down to Free=1.
 *
 * Does not touch Safepay-paid subscriptions (track_/non-promo ids with amount > 0).
 */
import { prisma } from "@/lib/prisma";
import { TUTOR_PRO_LAUNCH_HARD_END } from "@/lib/plans";
import { FREE_SUBJECT_PROFILES } from "@/lib/subject-profile-entitlements";
import { syncTutorBadges } from "@/lib/subscription";
import {
  selectSurvivor,
  type ConsolidationListing,
} from "@/lib/teaching-profile-consolidation";

const TUTOR_PRO_PLANS = ["TUTOR_BASIC", "EXTRA_PROFILE_ADS"] as const;

export type ComplimentaryExpireRow = {
  subscriptionId: string;
  userId: string;
  name: string | null;
  email: string | null;
  plan: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  activeTeachingProfiles: number;
  keepListingId: string | null;
  pauseListingIds: string[];
};

export type ComplimentaryExpireSummary = {
  generatedAt: string;
  mode: "dry-run" | "apply";
  hardEnd: string;
  now: string;
  candidates: number;
  canceled: number;
  profilesPaused: number;
  rows: ComplimentaryExpireRow[];
};

function isComplimentaryGrant(row: {
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  priceAmount: number | null;
}): boolean {
  const subId = (row.stripeSubscriptionId || "").toLowerCase();
  const priceId = (row.stripePriceId || "").toLowerCase();
  if (priceId.includes("promo") || priceId.includes("complimentary")) return true;
  if (subId.startsWith("promo_") || subId.startsWith("seed_")) return true;
  if (subId.startsWith("track_") || subId.startsWith("pi_") || subId.startsWith("cs_")) return false;
  if (row.priceAmount == null || Number(row.priceAmount) === 0) return true;
  return false;
}

/** Pause ACTIVE Teaching Profiles above Free=1; keep survivor (Boost > completeness > oldest). */
export async function pauseExcessTeachingProfilesToFreeCap(
  userId: string,
  now: Date = new Date(),
): Promise<{
  activeBefore: number;
  keepListingId: string | null;
  pauseListingIds: string[];
}> {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return { activeBefore: 0, keepListingId: null, pauseListingIds: [] };

  const active = await prisma.subjectProfile.findMany({
    where: { tutorProfileId: profile.id, status: "ACTIVE" },
    select: {
      id: true,
      status: true,
      subject: true,
      canonicalSubject: true,
      tutorProfileId: true,
      rate: true,
      online: true,
      inPerson: true,
      headline: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      boostUntil: true,
      highlightedUntil: true,
      capabilities: { select: { kind: true, value: true } },
    },
  });

  if (active.length <= FREE_SUBJECT_PROFILES) {
    return {
      activeBefore: active.length,
      keepListingId: active[0]?.id || null,
      pauseListingIds: [],
    };
  }

  const listings = active as ConsolidationListing[];
  const { survivor } = selectSurvivor(listings, now);
  const pause = active.filter((row) => row.id !== survivor.id);

  return {
    activeBefore: active.length,
    keepListingId: survivor.id,
    pauseListingIds: pause.map((row) => row.id),
  };
}

export async function expireComplimentaryTutorPro(opts?: {
  apply?: boolean;
  /** Pause ACTIVE Teaching Profiles above Free=1 after cancel (default true). */
  pauseExcessProfiles?: boolean;
  now?: Date;
}): Promise<ComplimentaryExpireSummary> {
  const apply = Boolean(opts?.apply);
  const pauseExcess = opts?.pauseExcessProfiles !== false;
  const now = opts?.now ?? new Date();

  const subs = await prisma.subscription.findMany({
    where: {
      plan: { in: [...TUTOR_PRO_PLANS] },
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    select: {
      id: true,
      userId: true,
      plan: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      priceAmount: true,
      currentPeriodEnd: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: ComplimentaryExpireRow[] = [];
  let canceled = 0;
  let profilesPaused = 0;

  for (const sub of subs) {
    if (!isComplimentaryGrant(sub)) continue;
    // Only expire once Launch hard end has passed (or period already ended).
    const periodEnd = sub.currentPeriodEnd;
    const pastHardEnd = now.getTime() > TUTOR_PRO_LAUNCH_HARD_END.getTime();
    const pastPeriod = periodEnd ? periodEnd.getTime() <= now.getTime() : false;
    if (!pastHardEnd && !pastPeriod) continue;

    const pausePlan = pauseExcess
      ? await pauseExcessTeachingProfilesToFreeCap(sub.userId, now)
      : { activeBefore: 0, keepListingId: null, pauseListingIds: [] as string[] };

    rows.push({
      subscriptionId: sub.id,
      userId: sub.userId,
      name: sub.user.name,
      email: sub.user.email,
      plan: sub.plan,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      stripePriceId: sub.stripePriceId,
      currentPeriodEnd: periodEnd?.toISOString() || null,
      activeTeachingProfiles: pausePlan.activeBefore,
      keepListingId: pausePlan.keepListingId,
      pauseListingIds: pausePlan.pauseListingIds,
    });

    if (!apply) continue;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "CANCELED",
        cancelledAt: now,
        currentPeriodEnd: TUTOR_PRO_LAUNCH_HARD_END,
        notes: [sub.stripePriceId, "expired_launch_complimentary"]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 500),
      },
    });
    canceled += 1;

    if (pausePlan.pauseListingIds.length) {
      await prisma.subjectProfile.updateMany({
        where: { id: { in: pausePlan.pauseListingIds } },
        data: { status: "PAUSED" },
      });
      profilesPaused += pausePlan.pauseListingIds.length;
    }

    await syncTutorBadges(sub.userId).catch(() => undefined);
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    hardEnd: TUTOR_PRO_LAUNCH_HARD_END.toISOString(),
    now: now.toISOString(),
    candidates: rows.length,
    canceled: apply ? canceled : 0,
    profilesPaused: apply ? profilesPaused : rows.reduce((n, r) => n + r.pauseListingIds.length, 0),
    rows,
  };
}
