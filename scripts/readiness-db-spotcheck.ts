/**
 * Non-destructive launch readiness DB spot check.
 * Usage: npx tsx scripts/readiness-db-spotcheck.ts
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const empty = await p.pastPaper.count({
    where: { OR: [{ session: null }, { session: "" }] },
  });
  const total = await p.pastPaper.count();
  const activeListings = await p.subjectProfile.count({ where: { status: "ACTIVE" } });
  const missingBoard = await p.subjectProfile.count({
    where: { status: "ACTIVE", OR: [{ board: null }, { board: "" }] },
  });
  const reviews = await p.review.count();
  const openReports = await p.report.count({ where: { status: "OPEN" } });
  const zeroSearch = await p.searchAnalyticsEvent.count({
    where: { type: "search_zero_results" },
  });
  const settings = await p.siteSettings.findFirst({
    where: { id: "default" },
    select: { planPrices: true },
  });
  const pp = (settings?.planPrices || {}) as Record<string, { name?: string; pricePkr?: number }>;
  const planOverrideNames: Record<string, string> = {};
  for (const k of ["TUTOR_BASIC", "VERIFIED_TUTOR", "AD_BOOST"] as const) {
    planOverrideNames[k] = pp[k]?.name || "(no override)";
  }

  console.log(
    JSON.stringify(
      {
        pastPapers: { total, emptySession: empty },
        listings: { active: activeListings, missingBoard },
        reviews,
        openReports,
        searchZeroResults: zeroSearch,
        planOverrideNames,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
