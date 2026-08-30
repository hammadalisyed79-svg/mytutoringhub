/**
 * Phase 9 — execute Teaching Profile consolidation.
 *
 * Dry-run first (default). Pass --execute to pause non-survivors, union
 * capabilities onto the survivor, and write 301 redirects. Does not delete
 * `/listings/{id}` rows. Does not explode leftover CSV tags.
 *
 * Usage:
 *   npx tsx scripts/execute-teaching-profile-consolidation.ts
 *   npx tsx scripts/execute-teaching-profile-consolidation.ts --execute
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { canonicalTeachingSubject } from "../src/lib/teaching-profile-subject";
import {
  groupByCanonicalSubject,
  multiRowCanonicalGroups,
  activeCanonicalCollisionGroups,
  canApplyActiveCanonicalUniqueIndex,
} from "../src/lib/teaching-profile-duplicates";
import {
  dryRunConsolidateGroup,
  executeConsolidateGroup,
  leftoverCsvTagsNotExploded,
  type ConsolidationListing,
} from "../src/lib/teaching-profile-consolidation";

config();
config({ path: ".env.local" });

const OUT = join(process.cwd(), "docs", "MTH-TEACHING-PROFILES-PHASE9-EXECUTE.md");
const EXECUTE = process.argv.includes("--execute");

function isoStamp() {
  return new Date().toISOString();
}

async function ensureRedirectTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeachingProfileRedirect" (
      "fromId" TEXT NOT NULL,
      "toId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TeachingProfileRedirect_pkey" PRIMARY KEY ("fromId")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TeachingProfileRedirect_toId_idx" ON "TeachingProfileRedirect" ("toId")`,
  );
}

async function applyUniqueIndexIfSafe(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM "SubjectProfile"
        WHERE status = 'ACTIVE'
          AND btrim("canonicalSubject") <> ''
        GROUP BY "tutorProfileId", lower(btrim("canonicalSubject"))
        HAVING COUNT(*) > 1
      ) THEN
        RAISE NOTICE 'Skipped unique index: ACTIVE collisions remain';
      ELSE
        EXECUTE $sql$
          CREATE UNIQUE INDEX IF NOT EXISTS "SubjectProfile_active_tutor_canonical_uidx"
          ON "SubjectProfile" ("tutorProfileId", (lower(btrim("canonicalSubject"))))
          WHERE status = 'ACTIVE' AND btrim("canonicalSubject") <> ''
        $sql$;
      END IF;
    END $$;
  `);
}

async function loadListings(prisma: PrismaClient): Promise<ConsolidationListing[]> {
  const rows = await prisma.subjectProfile.findMany({
    select: {
      id: true,
      tutorProfileId: true,
      subject: true,
      canonicalSubject: true,
      status: true,
      level: true,
      board: true,
      qualification: true,
      syllabusCode: true,
      rate: true,
      boostUntil: true,
      highlightedUntil: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      description: true,
      headline: true,
      capabilities: { select: { kind: true, value: true } },
    },
    orderBy: [{ tutorProfileId: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    ...row,
    capabilities: row.capabilities,
  }));
}

async function backfillCanonical(prisma: PrismaClient, listings: ConsolidationListing[]) {
  for (const row of listings) {
    const to = canonicalTeachingSubject(row.subject).canonical || row.subject;
    if (!to) continue;
    const from = (row.canonicalSubject || "").trim();
    if (from.toLowerCase() === to.toLowerCase()) continue;
    await prisma.subjectProfile.update({
      where: { id: row.id },
      data: { canonicalSubject: to },
    });
    row.canonicalSubject = to;
  }
}

function report(opts: {
  execute: boolean;
  listings: number;
  groups: number;
  active: number;
  executed: { survivorId: string; redirectIds: string[]; canonical: string }[];
  uniqueIndexSafe: boolean;
  leftoverTutors: number;
}) {
  const table = opts.executed.length
    ? [
        "| Canonical | Kept | Redirected (paused, 301) |",
        "|---|---|---|",
        ...opts.executed.map(
          (row) =>
            `| ${row.canonical} | \`${row.survivorId}\` | ${row.redirectIds.map((id) => `\`${id}\``).join(" ") || "—"} |`,
        ),
      ].join("\n")
    : "_No groups executed._";

  return `# Teaching Profiles Phase 9 — consolidation

**Generated:** ${isoStamp()}  
**Mode:** ${opts.execute ? "EXECUTE" : "DRY-RUN (pass --execute to write)"}  
**Rows scanned:** ${opts.listings}

Paused non-survivors. Did **not** delete listing ids. Redirect table maps old \`/listings/{id}\` to the survivor.

## Counts

| Metric | Count |
|--------|------:|
| Teaching Profiles | ${opts.listings} |
| Same-canonical groups | ${opts.groups} |
| ACTIVE collision groups (before this run) | ${opts.active} |
| Groups written | ${opts.executed.length} |
| Unique index safe | ${opts.uniqueIndexSafe ? "yes" : "no"} |
| Leftover CSV tutors (not exploded) | ${opts.leftoverTutors} |

## Survivor / redirect

${table}

Re-run dry-run:

\`\`\`bash
npx tsx scripts/dry-run-teaching-profile-consolidation.ts
\`\`\`
`;
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    writeFileSync(OUT, `# Phase 9\n\nSkipped: no DATABASE_URL.\n`, "utf8");
    console.log("skipped: no DATABASE_URL");
    return;
  }

  const prisma = new PrismaClient();
  try {
    await ensureRedirectTable(prisma);
    let listings = await loadListings(prisma);
    if (EXECUTE) {
      await backfillCanonical(prisma, listings);
      listings = await loadListings(prisma);
    }

    const groups = groupByCanonicalSubject(listings);
    const multi = multiRowCanonicalGroups(groups);
    const active = activeCanonicalCollisionGroups(groups);
    const leftoverTutors = new Set<string>();
    const profiles = await prisma.tutorProfile.findMany({
      select: { id: true, subjects: true },
    });
    for (const profile of profiles) {
      const tags = leftoverCsvTagsNotExploded(
        profile.subjects,
        listings.filter((row) => row.tutorProfileId === profile.id),
      );
      if (tags.length) leftoverTutors.add(profile.id);
    }

    const executed: { survivorId: string; redirectIds: string[]; canonical: string }[] = [];
    if (EXECUTE) {
      for (const group of multi) {
        const result = await executeConsolidateGroup(prisma as never, group);
        executed.push({
          survivorId: result.survivorId,
          redirectIds: result.redirectIds,
          canonical: result.canonical,
        });
      }
      await applyUniqueIndexIfSafe(prisma);
    } else {
      for (const group of multi) {
        const dry = dryRunConsolidateGroup(group);
        executed.push({
          survivorId: dry.survivorId,
          redirectIds: dry.redirectIds,
          canonical: dry.canonical,
        });
      }
    }

    const after = EXECUTE ? groupByCanonicalSubject(await loadListings(prisma)) : groups;
    const uniqueIndexSafe = canApplyActiveCanonicalUniqueIndex(after);

    writeFileSync(
      OUT,
      report({
        execute: EXECUTE,
        listings: listings.length,
        groups: multi.length,
        active: active.length,
        executed,
        uniqueIndexSafe,
        leftoverTutors: leftoverTutors.size,
      }),
      "utf8",
    );

    console.log(
      JSON.stringify(
        {
          out: OUT,
          execute: EXECUTE,
          groups: multi.length,
          activeCollisions: active.length,
          written: EXECUTE ? executed.length : 0,
          uniqueIndexSafe,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
