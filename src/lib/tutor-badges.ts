import { prisma } from "@/lib/prisma";

export const TUTOR_TRUST_BADGES = {
  NEW: {
    id: "NEW",
    label: "New Tutor",
    shortLabel: "New Tutor",
    emoji: "🎓",
    order: 0,
  },
  RECOMMENDED: {
    id: "RECOMMENDED",
    label: "Recommended Tutor",
    shortLabel: "Recommended",
    emoji: "⭐",
    order: 1,
  },
  SUPER: {
    id: "SUPER",
    label: "Super Tutor",
    shortLabel: "Super",
    emoji: "🏆",
    order: 2,
  },
  TOP: {
    id: "TOP",
    label: "Top Tutor",
    shortLabel: "Top",
    emoji: "👑",
    order: 3,
  },
} as const;

export type TutorTrustBadge = keyof typeof TUTOR_TRUST_BADGES;

export const TRUST_BADGE_EXTERNAL_FOR_RECOMMENDED = 2;
export const TRUST_BADGE_EXTERNAL_FOR_SUPER = 4;
export const TRUST_BADGE_PLATFORM_FOR_SUPER = 1;
export const TRUST_BADGE_PLATFORM_FOR_TOP = 3;

export type TutorBadgeStats = {
  approvedExternalRecs: number;
  publishedPlatformReviews: number;
};

export function computeTutorTrustBadge(stats: TutorBadgeStats): TutorTrustBadge {
  const ext = stats.approvedExternalRecs;
  const platform = stats.publishedPlatformReviews;
  if (ext >= TRUST_BADGE_EXTERNAL_FOR_SUPER && platform >= TRUST_BADGE_PLATFORM_FOR_TOP) {
    return "TOP";
  }
  if (ext >= TRUST_BADGE_EXTERNAL_FOR_SUPER && platform >= TRUST_BADGE_PLATFORM_FOR_SUPER) {
    return "SUPER";
  }
  if (ext >= TRUST_BADGE_EXTERNAL_FOR_RECOMMENDED) {
    return "RECOMMENDED";
  }
  return "NEW";
}

export function trustBadgeMeta(badge: string | null | undefined) {
  const key = (badge || "NEW") as TutorTrustBadge;
  return TUTOR_TRUST_BADGES[key] ?? TUTOR_TRUST_BADGES.NEW;
}

export function trustBadgeSearchScore(badge: string | null | undefined) {
  return trustBadgeMeta(badge).order * 2;
}

export type BadgeProgress = {
  current: TutorTrustBadge;
  next: TutorTrustBadge | null;
  approvedExternalRecs: number;
  publishedPlatformReviews: number;
  externalTarget: number;
  platformTarget: number;
  externalNeeded: number;
  platformNeeded: number;
  steps: { label: string; done: boolean; detail: string }[];
};

export function tutorBadgeProgress(stats: TutorBadgeStats): BadgeProgress {
  const current = computeTutorTrustBadge(stats);
  const steps = [
    {
      label: "New Tutor",
      done: true,
      detail: "Automatic for every new tutor profile.",
    },
    {
      label: "Recommended Tutor",
      done: stats.approvedExternalRecs >= TRUST_BADGE_EXTERNAL_FOR_RECOMMENDED,
      detail: `${Math.min(stats.approvedExternalRecs, TRUST_BADGE_EXTERNAL_FOR_RECOMMENDED)}/${TRUST_BADGE_EXTERNAL_FOR_RECOMMENDED} verified off-platform recommendations`,
    },
    {
      label: "Super Tutor",
      done:
        stats.approvedExternalRecs >= TRUST_BADGE_EXTERNAL_FOR_SUPER &&
        stats.publishedPlatformReviews >= TRUST_BADGE_PLATFORM_FOR_SUPER,
      detail: `${Math.min(stats.approvedExternalRecs, TRUST_BADGE_EXTERNAL_FOR_SUPER)}/${TRUST_BADGE_EXTERNAL_FOR_SUPER} verified recommendations + ${Math.min(stats.publishedPlatformReviews, TRUST_BADGE_PLATFORM_FOR_SUPER)}/${TRUST_BADGE_PLATFORM_FOR_SUPER} on-platform review`,
    },
    {
      label: "Top Tutor",
      done:
        stats.approvedExternalRecs >= TRUST_BADGE_EXTERNAL_FOR_SUPER &&
        stats.publishedPlatformReviews >= TRUST_BADGE_PLATFORM_FOR_TOP,
      detail: `${Math.min(stats.publishedPlatformReviews, TRUST_BADGE_PLATFORM_FOR_TOP)}/${TRUST_BADGE_PLATFORM_FOR_TOP} on-platform reviews (with ${TRUST_BADGE_EXTERNAL_FOR_SUPER} verified recommendations)`,
    },
  ];

  let next: TutorTrustBadge | null = null;
  let externalTarget = TRUST_BADGE_EXTERNAL_FOR_RECOMMENDED;
  let platformTarget = 0;

  if (current === "NEW") {
    next = "RECOMMENDED";
    externalTarget = TRUST_BADGE_EXTERNAL_FOR_RECOMMENDED;
    platformTarget = 0;
  } else if (current === "RECOMMENDED") {
    next = "SUPER";
    externalTarget = TRUST_BADGE_EXTERNAL_FOR_SUPER;
    platformTarget = TRUST_BADGE_PLATFORM_FOR_SUPER;
  } else if (current === "SUPER") {
    next = "TOP";
    externalTarget = TRUST_BADGE_EXTERNAL_FOR_SUPER;
    platformTarget = TRUST_BADGE_PLATFORM_FOR_TOP;
  }

  return {
    current,
    next,
    approvedExternalRecs: stats.approvedExternalRecs,
    publishedPlatformReviews: stats.publishedPlatformReviews,
    externalTarget,
    platformTarget,
    externalNeeded: Math.max(0, externalTarget - stats.approvedExternalRecs),
    platformNeeded: Math.max(0, platformTarget - stats.publishedPlatformReviews),
    steps,
  };
}

export async function getTutorBadgeStats(tutorProfileId: string): Promise<TutorBadgeStats> {
  try {
    const [approvedExternalRecs, publishedPlatformReviews] = await Promise.all([
      prisma.tutorRecommendation.count({
        where: { tutorProfileId, status: "APPROVED" },
      }),
      prisma.review.count({
        where: { tutorProfileId, status: "PUBLISHED" },
      }),
    ]);
    return { approvedExternalRecs, publishedPlatformReviews };
  } catch (err) {
    console.error("[tutor-badges] stats unavailable", { tutorProfileId, err });
    const publishedPlatformReviews = await prisma.review
      .count({ where: { tutorProfileId, status: "PUBLISHED" } })
      .catch(() => 0);
    return { approvedExternalRecs: 0, publishedPlatformReviews };
  }
}

/** Batch badge lookup for search cards — safe when TutorRecommendation table is not migrated yet. */
export async function getTrustBadgesForProfiles(
  profileIds: string[],
): Promise<Map<string, TutorTrustBadge>> {
  const badges = new Map<string, TutorTrustBadge>();
  for (const id of profileIds) badges.set(id, "NEW");
  if (!profileIds.length) return badges;

  let reviewCounts = new Map<string, number>();
  let recCounts = new Map<string, number>();

  try {
    const reviews = await prisma.review.findMany({
      where: { tutorProfileId: { in: profileIds }, status: "PUBLISHED" },
      select: { tutorProfileId: true },
    });
    for (const row of reviews) {
      reviewCounts.set(row.tutorProfileId, (reviewCounts.get(row.tutorProfileId) ?? 0) + 1);
    }
  } catch (err) {
    console.error("[tutor-badges] review lookup failed", err);
  }

  try {
    const recs = await prisma.tutorRecommendation.findMany({
      where: { tutorProfileId: { in: profileIds }, status: "APPROVED" },
      select: { tutorProfileId: true },
    });
    for (const row of recs) {
      recCounts.set(row.tutorProfileId, (recCounts.get(row.tutorProfileId) ?? 0) + 1);
    }
  } catch (err) {
    console.error("[tutor-badges] recommendation lookup failed", err);
  }

  for (const id of profileIds) {
    badges.set(
      id,
      computeTutorTrustBadge({
        approvedExternalRecs: recCounts.get(id) ?? 0,
        publishedPlatformReviews: reviewCounts.get(id) ?? 0,
      }),
    );
  }

  return badges;
}

export async function syncTutorTrustBadge(tutorProfileId: string) {
  const stats = await getTutorBadgeStats(tutorProfileId);
  return computeTutorTrustBadge(stats);
}

export async function syncTutorTrustBadgeForUser(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return null;
  return syncTutorTrustBadge(profile.id);
}
