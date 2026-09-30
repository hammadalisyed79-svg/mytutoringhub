/**
 * READ-ONLY inventory of abandoned / Incomplete Safepay checkouts.
 * Does not revoke, recover, or mutate rows.
 *
 * Usage: npx tsx scripts/incomplete-payments-audit-readonly.ts [--write]
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DAY_MS = 86400000;

function ageBucket(createdAt: Date, now: number) {
  const ageDays = (now - createdAt.getTime()) / DAY_MS;
  if (ageDays < 1) return "<1d";
  if (ageDays < 7) return "1-7d";
  if (ageDays < 30) return "7-30d";
  return "30d+";
}

function trackerKind(id: string | null | undefined) {
  if (!id) return "none";
  if (id.startsWith("track_")) return "safepay_track";
  if (/manual|admin_comp|promo/i.test(id)) return "manual_or_promo";
  return "other";
}

async function main() {
  const prisma = new PrismaClient();
  const write = process.argv.includes("--write");
  const now = Date.now();
  try {
    const rows = await prisma.subscription.findMany({
      where: { status: "INCOMPLETE" },
      select: {
        id: true,
        plan: true,
        createdAt: true,
        stripePriceId: true,
        stripeSubscriptionId: true,
        userId: true,
      },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });

    const byPlan: Record<string, number> = {};
    const byAge: Record<string, number> = {};
    const byTracker: Record<string, number> = {};
    for (const row of rows) {
      byPlan[row.plan] = (byPlan[row.plan] || 0) + 1;
      const age = ageBucket(row.createdAt, now);
      byAge[age] = (byAge[age] || 0) + 1;
      const kind = trackerKind(row.stripeSubscriptionId);
      byTracker[kind] = (byTracker[kind] || 0) + 1;
    }

    const stale7d = rows.filter((r) => now - r.createdAt.getTime() >= 7 * DAY_MS);
    const report = {
      generatedAt: new Date().toISOString(),
      mode: "read-only",
      totals: {
        incomplete: rows.length,
        stale7dOrOlder: stale7d.length,
      },
      byPlan,
      byAge,
      byTracker,
      sampleOldest: rows.slice(0, 25).map((r) => ({
        id: r.id,
        plan: r.plan,
        createdAt: r.createdAt.toISOString(),
        trackerKind: trackerKind(r.stripeSubscriptionId),
        priceId: r.stripePriceId,
      })),
      nextActions: [
        "Prefer Recover only when Safepay shows the tracker as paid.",
        "Force-complete tags stripePriceId as manual_force_complete (not cash revenue).",
        "Revoke stale INCOMPLETE rows (TRACKER_STARTED / unpaid) from admin after reviewing this inventory.",
        "Do not bulk-delete without confirming no paid-but-unreconciled trackers remain.",
      ],
    };

    console.log(JSON.stringify({ totals: report.totals, byPlan, byAge, byTracker }, null, 2));
    if (write) {
      const out = resolve("docs/MTH-INCOMPLETE-PAYMENTS-AUDIT-READONLY.json");
      writeFileSync(out, JSON.stringify(report, null, 2));
      console.log("Wrote", out);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
