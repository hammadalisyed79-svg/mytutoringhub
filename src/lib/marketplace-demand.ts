import { prisma } from "@/lib/prisma";

export type DemandRow = {
  subject: string;
  openRequests: number;
  liveListings: number;
  gap: number;
  signal: "recruit" | "healthy" | "oversupplied";
};

/**
 * Marketplace demand snapshot: open student requests vs live teaching listings.
 * Used by admin to decide where to recruit tutors.
 */
export async function getMarketplaceDemand(limit = 24): Promise<DemandRow[]> {
  const [ads, listings] = await Promise.all([
    prisma.studentAd.groupBy({
      by: ["subject"],
      where: { status: "OPEN" },
      _count: { _all: true },
    }),
    prisma.subjectProfile.groupBy({
      by: ["subject"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  const requestMap = new Map(ads.map((row) => [row.subject.trim(), row._count._all]));
  const listingMap = new Map(listings.map((row) => [row.subject.trim(), row._count._all]));
  const subjects = new Set([...requestMap.keys(), ...listingMap.keys()]);

  const rows: DemandRow[] = [];
  for (const subject of subjects) {
    if (!subject) continue;
    const openRequests = requestMap.get(subject) || 0;
    const liveListings = listingMap.get(subject) || 0;
    const gap = openRequests - liveListings;
    const signal: DemandRow["signal"] =
      openRequests > 0 && liveListings <= Math.max(1, Math.floor(openRequests / 2))
        ? "recruit"
        : liveListings >= 8 && openRequests === 0
          ? "oversupplied"
          : "healthy";
    rows.push({ subject, openRequests, liveListings, gap, signal });
  }

  rows.sort((a, b) => {
    const rank = (s: DemandRow["signal"]) => (s === "recruit" ? 0 : s === "healthy" ? 1 : 2);
    return rank(a.signal) - rank(b.signal) || b.openRequests - a.openRequests || a.subject.localeCompare(b.subject);
  });

  return rows.slice(0, limit);
}
