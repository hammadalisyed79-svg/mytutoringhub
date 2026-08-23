/**
 * One-time tutor catalogue visibility sync.
 *
 * Default: dry-run (zero writes).
 * Mutate:  npx tsx scripts/sync-tutor-public-visibility.ts --apply
 *
 * Only updates TutorProfile.active to match canonical syncTutorBadges visibility:
 *   active = forceActive || (emailVerified && isTutorProfileListable(...))
 *
 * Does not delete users, change plans, names, bios, rates, or forceActive.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

type Category = "A" | "B" | "C" | "D" | "E";

async function main() {
  const apply = process.argv.includes("--apply");
  const { prisma } = await import("../src/lib/prisma");
  const { computeDesiredTutorPublicActive } = await import("../src/lib/tutor-public-eligibility");

  const now = new Date();
  const profiles = await prisma.tutorProfile.findMany({
    select: {
      id: true,
      active: true,
      forceActive: true,
      headline: true,
      bio: true,
      subjects: true,
      qualifications: true,
      country: true,
      location: true,
      hourlyRate: true,
      photoUrl: true,
      online: true,
      inPerson: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          emailVerified: true,
          suspended: true,
          role: true,
        },
      },
      // plan labels only — no payment secrets
    },
  });

  const userIds = profiles.map((p) => p.userId);
  const subs = await prisma.subscription.findMany({
    where: {
      userId: { in: userIds },
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
    select: { userId: true, plan: true },
  });
  const plansByUser = new Map<string, string[]>();
  for (const s of subs) {
    const list = plansByUser.get(s.userId) || [];
    list.push(s.plan);
    plansByUser.set(s.userId, list);
  }

  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const wouldHide: Array<Record<string, unknown>> = [];
  const wouldShow: Array<Record<string, unknown>> = [];
  const manualReview: Array<Record<string, unknown>> = [];
  const mutations: Array<{ id: string; before: boolean; after: boolean; reasons: string[] }> = [];

  for (const p of profiles) {
    const assessment = computeDesiredTutorPublicActive({
      forceActive: p.forceActive,
      emailVerified: p.user.emailVerified,
      name: p.user.name,
      photoUrl: p.photoUrl,
      headline: p.headline,
      bio: p.bio,
      country: p.country,
      location: p.location,
      subjects: p.subjects,
      hourlyRate: p.hourlyRate,
      online: p.online,
      inPerson: p.inPerson,
      qualifications: p.qualifications,
      suspended: p.user.suspended,
    });

    const currentlyPublic = p.active;
    const shouldPublic = assessment.desiredActive;
    const plans = plansByUser.get(p.userId) || [];
    const paid = plans.some((plan) =>
      ["TUTOR_BASIC", "VERIFIED_TUTOR", "HIGHLIGHTED_AD", "AD_BOOST", "UNLIMITED_ADS"].includes(plan),
    );

    let category: Category;
    if (currentlyPublic && !shouldPublic) category = "C";
    else if (!currentlyPublic && shouldPublic) category = "D";
    else {
      const weakButListable =
        shouldPublic &&
        !assessment.forceActiveOverride &&
        (p.bio?.trim().length ?? 0) > 0 &&
        (p.bio?.trim().length ?? 0) < 80;
      const needsManual =
        assessment.forceActiveOverride || (p.user.suspended && p.active) || weakButListable;
      if (needsManual) {
        category = "E";
        manualReview.push({
          profileId: p.id,
          displayName: p.user.name || "(empty)",
          forceActive: p.forceActive,
          suspended: p.user.suspended,
          currentlyPublic,
          shouldPublic,
          paid,
          plans,
          reasons: [
            ...(assessment.forceActiveOverride ? ["forceActive_override"] : []),
            ...(p.user.suspended && p.active ? ["suspended_but_active_flag"] : []),
            ...(weakButListable ? ["short_bio_manual_review"] : []),
            ...assessment.blockReasons,
          ],
        });
      } else if (currentlyPublic && shouldPublic) category = "A";
      else category = "B";
    }

    // Visibility mismatches also noted when forceActive would have been the only reason they stay public
    if ((category === "C" || category === "D") && assessment.forceActiveOverride) {
      manualReview.push({
        profileId: p.id,
        displayName: p.user.name || "(empty)",
        forceActive: p.forceActive,
        suspended: p.user.suspended,
        currentlyPublic,
        shouldPublic,
        paid,
        plans,
        reasons: ["visibility_mismatch_with_forceActive", ...assessment.blockReasons],
      });
    }

    counts[category] += 1;

    const row = {
      profileId: p.id,
      displayName: p.user.name || "(empty)",
      currentlyPublic,
      shouldPublic,
      forceActive: p.forceActive,
      emailVerified: assessment.emailVerified,
      listable: assessment.listable,
      complete: assessment.complete,
      suspiciousName: assessment.suspiciousName,
      paid,
      plans,
      missingRequired: assessment.missingRequired,
      blockReasons: assessment.blockReasons,
      forceActiveOverride: assessment.forceActiveOverride,
    };

    if (currentlyPublic && !shouldPublic) wouldHide.push(row);
    if (!currentlyPublic && shouldPublic) wouldShow.push(row);

    if (currentlyPublic !== shouldPublic) {
      mutations.push({
        id: p.id,
        before: currentlyPublic,
        after: shouldPublic,
        reasons: shouldPublic
          ? ["now_meets_listing_rules", ...(assessment.forceActiveOverride ? ["forceActive"] : [])]
          : assessment.blockReasons.length
            ? assessment.blockReasons
            : ["not_listable"],
      });
    }
  }

  const summary = {
    mode: apply ? "APPLY" : "DRY_RUN",
    evaluated: profiles.length,
    unchanged: profiles.length - mutations.length,
    wouldBecomeHidden: wouldHide.length,
    wouldBecomePublic: wouldShow.length,
    categories: counts,
    manualReviewCount: manualReview.length,
    forceActiveOverrides: manualReview.filter((r) =>
      (r.reasons as string[]).includes("forceActive_override"),
    ).length,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("\n--- Proposed hides (C) ---");
  for (const r of wouldHide) {
    console.log(
      `${r.profileId} | ${r.displayName} | reasons=${(r.blockReasons as string[]).join(",") || "n/a"} | forceActive=${r.forceActive} | paid=${r.paid}`,
    );
  }
  console.log("\n--- Proposed shows (D) ---");
  for (const r of wouldShow) {
    console.log(
      `${r.profileId} | ${r.displayName} | forceActive=${r.forceActive} | paid=${r.paid}`,
    );
  }
  console.log("\n--- Manual review sample (max 30) ---");
  for (const r of manualReview.slice(0, 30)) {
    console.log(
      `${r.profileId} | ${r.displayName} | ${(r.reasons as string[]).join(",")}`,
    );
  }

  const reportPath = resolve(process.cwd(), "tmp_tutor_visibility_dry_run.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        summary,
        wouldHide,
        wouldShow,
        manualReview,
        mutations,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${reportPath}`);

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to update TutorProfile.active.");
    await prisma.$disconnect();
    return;
  }

  if (mutations.length === 0) {
    console.log("Nothing to apply.");
    await prisma.$disconnect();
    return;
  }

  // Safety: refuse huge unexpected flips without an explicit override flag
  const hideRatio = wouldHide.length / Math.max(1, profiles.length);
  if (hideRatio > 0.75 && profiles.length > 20 && !process.argv.includes("--force-large")) {
    console.error(
      `Refusing apply: would hide ${wouldHide.length}/${profiles.length} (${Math.round(hideRatio * 100)}%). Pass --force-large if intentional.`,
    );
    process.exit(2);
  }

  let updated = 0;
  for (const m of mutations) {
    await prisma.tutorProfile.update({
      where: { id: m.id },
      data: { active: m.after },
    });
    updated += 1;
    console.log(`UPDATED ${m.id}: active ${m.before} → ${m.after} (${m.reasons.join("; ")})`);
  }

  console.log(`\nApplied ${updated} visibility updates. forceActive unchanged.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
