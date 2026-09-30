/**
 * Enforce Free=1 ACTIVE Teaching Profiles for over-cap Free tutors
 * (ends the old Free=3 / grandfather exception).
 *
 *   npx tsx scripts/enforce-free-teaching-profile-cap.ts
 *   npx tsx scripts/enforce-free-teaching-profile-cap.ts --apply --write
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { auditProfileVsPlan } from "../src/lib/profile-vs-plan-audit";
import { pauseExcessTeachingProfilesToFreeCap } from "../src/lib/expire-complimentary-tutor-pro";
import { syncTutorBadges } from "../src/lib/subscription";

config({ path: ".env.local" });
config();

async function main() {
  const apply = process.argv.includes("--apply");
  const write = process.argv.includes("--write");
  const audit = await auditProfileVsPlan({ sampleLimit: 500 });
  const targets = audit.samples.filter(
    (row) =>
      row.bucket === "free_grandfather_over_cap" || row.bucket === "expired_pro_over_free",
  );

  const rows = [];
  let pausedTotal = 0;
  for (const target of targets) {
    const plan = await pauseExcessTeachingProfilesToFreeCap(target.userId);
    const user = await prisma.user.findUnique({
      where: { id: target.userId },
      select: { name: true, email: true },
    });
    rows.push({
      userId: target.userId,
      name: user?.name || null,
      email: user?.email || null,
      bucket: target.bucket,
      activeBefore: plan.activeBefore,
      keepListingId: plan.keepListingId,
      pauseListingIds: plan.pauseListingIds,
    });
    if (!apply || !plan.pauseListingIds.length) continue;
    await prisma.subjectProfile.updateMany({
      where: { id: { in: plan.pauseListingIds } },
      data: { status: "PAUSED" },
    });
    pausedTotal += plan.pauseListingIds.length;
    await syncTutorBadges(target.userId).catch(() => undefined);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    candidates: rows.length,
    profilesPaused: apply ? pausedTotal : rows.reduce((n, r) => n + r.pauseListingIds.length, 0),
    rows,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (write) {
    const out = resolve("docs/MTH-FREE-TP-CAP-ENFORCE.json");
    writeFileSync(out, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ wrote: out }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
