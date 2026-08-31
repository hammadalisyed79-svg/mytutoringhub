/**
 * Read-only audit: Free tutor Teaching Profile counts vs Free=1 cap.
 * Does not mutate data.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();
config({ path: ".env.local" });

const p = new PrismaClient();

async function main() {
  const now = new Date();
  const tutors = await p.user.findMany({
    where: { role: "TUTOR", suspended: false },
    select: {
      id: true,
      subscriptions: {
        where: {
          status: { in: ["ACTIVE", "TRIALING"] },
          OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
        },
        select: { plan: true },
      },
      tutorProfile: {
        select: {
          forceActive: true,
          verified: true,
          subjectProfiles: {
            select: { id: true, status: true, boostUntil: true, highlightedUntil: true, subject: true },
          },
        },
      },
    },
  });

  let free = 0;
  let pro = 0;
  let legacyExtra = 0;
  let legacyUnlimited = 0;
  const buckets = { 0: 0, 1: 0, 2: 0, "3+": 0 };
  let freeOverCap = 0;
  let freeWithBoost = 0;
  let freeWithHighlight = 0;
  let complimentaryPro = 0;
  const overSamples: { id: string; active: number; subjects: string[] }[] = [];

  for (const t of tutors) {
    const plans = t.subscriptions.map((s) => s.plan);
    const hasUnlimited = plans.includes("UNLIMITED_ADS");
    const hasExtra = plans.includes("EXTRA_PROFILE_ADS");
    const hasPro = plans.includes("TUTOR_BASIC");

    if (hasUnlimited) {
      legacyUnlimited++;
      continue;
    }
    if (hasExtra) {
      legacyExtra++;
      continue;
    }
    if (hasPro) {
      pro++;
      complimentaryPro++; // promo may still be 0 PKR; count as Pro holders
      continue;
    }

    free++;
    const active = (t.tutorProfile?.subjectProfiles || []).filter((sp) => sp.status === "ACTIVE");
    const n = active.length;
    if (n === 0) buckets[0]++;
    else if (n === 1) buckets[1]++;
    else if (n === 2) buckets[2]++;
    else buckets["3+"]++;

    if (n > 1) {
      freeOverCap++;
      if (overSamples.length < 12) {
        overSamples.push({
          id: t.id.slice(0, 10),
          active: n,
          subjects: active.map((a) => a.subject).slice(0, 5),
        });
      }
    }
    if (active.some((sp) => sp.boostUntil && sp.boostUntil > now)) freeWithBoost++;
    if (active.some((sp) => sp.highlightedUntil && sp.highlightedUntil > now)) freeWithHighlight++;
  }

  const settings = await p.siteSettings.findFirst({ where: { id: "default" } });
  const totalPapers = await p.pastPaper.count();
  const published = await p.pastPaper.count({ where: { published: true, isPublic: true, isActive: true } });

  const eligible = await p.tutorProfile.count({
    where: {
      OR: [{ forceActive: true }, { AND: [{ active: true }, { user: { emailVerified: { not: null } } }] }],
    },
  });
  const activeSp = await p.subjectProfile.count({ where: { status: "ACTIVE" } });

  console.log(
    JSON.stringify(
      {
        dbHint: process.env.DATABASE_URL?.startsWith("postgres") ? "postgres" : "other",
        tutorsTotal: tutors.length,
        free,
        pro,
        legacyExtra,
        legacyUnlimited,
        freeActiveBuckets: buckets,
        freeOverCap,
        freeWithBoost,
        freeWithHighlight,
        overSamples,
        pastPaperFeePkr: settings?.pastPaperFeePkr ?? null,
        totalPapers,
        publishedPublicActivePapers: published,
        publicEligibleTutorProfiles: eligible,
        activeSubjectProfiles: activeSp,
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
  .finally(() => p.$disconnect());
