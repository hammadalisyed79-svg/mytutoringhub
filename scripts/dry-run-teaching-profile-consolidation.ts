/**
 * Teaching Profile consolidation DRY-RUN.
 *
 * Prints what WOULD merge (survivor, redirects, capability union). Does not
 * insert, update, delete, merge, pause, or redirect. Does not explode CSV.
 *
 * Usage: npx tsx scripts/dry-run-teaching-profile-consolidation.ts
 * Writes: docs/MTH-TEACHING-PROFILES-PHASE3-DRY-RUN.md
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  groupByCanonicalSubject,
  multiRowCanonicalGroups,
  activeCanonicalCollisionGroups,
  canApplyActiveCanonicalUniqueIndex,
} from "../src/lib/teaching-profile-duplicates";
import {
  dryRunConsolidateGroup,
  leftoverCsvTagsNotExploded,
  TEACHING_PROFILE_SURVIVOR_RULES,
  CONSOLIDATION_EXECUTE,
  type ConsolidationListing,
} from "../src/lib/teaching-profile-consolidation";

config();
config({ path: ".env.local" });

const OUT = join(process.cwd(), "docs", "MTH-TEACHING-PROFILES-PHASE3-DRY-RUN.md");

function isoStamp() {
  return new Date().toISOString();
}

function mdEscape(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function skippedDoc(reason: string) {
  return `# Teaching Profiles Phase 3 — consolidation dry-run

**Status:** SKIPPED  
**Generated:** ${isoStamp()}  
**Execute:** \`${CONSOLIDATION_EXECUTE}\` (must stay false)

${reason}

${TEACHING_PROFILE_SURVIVOR_RULES}

Re-run:

\`\`\`bash
npx tsx scripts/dry-run-teaching-profile-consolidation.ts
\`\`\`
`;
}

function reportDoc(opts: {
  listings: ConsolidationListing[];
  leftover: { tutorProfileId: string; tags: string[] }[];
}) {
  const groups = groupByCanonicalSubject(opts.listings);
  const multi = multiRowCanonicalGroups(groups);
  const active = activeCanonicalCollisionGroups(groups);
  const dryRuns = multi.map((g) => dryRunConsolidateGroup(g));
  const uniqueIndexSafe = canApplyActiveCanonicalUniqueIndex(groups);

  const dryTable = dryRuns.length
    ? [
        "| TutorProfile | Canonical | Would keep | Would redirect | Capability union | Rate conflict | Boost conflict | Reasons | Execute |",
        "|---|---|---|---|---|---|---|---|---|",
        ...dryRuns.map((d) => {
          const caps = d.capabilityUnion.map((c) => `${c.kind}:${c.value}`).join("; ") || "—";
          return `| \`${d.tutorProfileId}\` | ${mdEscape(d.canonical)} | \`${d.survivorId}\` | ${d.redirectIds.map((id) => `\`${id}\``).join(" ") || "—"} | ${mdEscape(caps)} | ${d.rateConflict ? "yes" : "no"} | ${d.boostConflict ? "yes" : "no"} | ${mdEscape(d.survivorReasons.join("; "))} | false |`;
        }),
      ].join("\n")
    : "_None._";

  const leftoverTable = opts.leftover.length
    ? [
        "| TutorProfile | Leftover CSV tags (do not auto-create) |",
        "|---|---|",
        ...opts.leftover.map(
          (row) => `| \`${row.tutorProfileId}\` | ${mdEscape(row.tags.join(", "))} |`,
        ),
      ].join("\n")
    : "_None._";

  return `# Teaching Profiles Phase 3 — consolidation dry-run

**Status:** PREVIEW ONLY (no writes)  
**Generated:** ${isoStamp()}  
**Execute:** \`${CONSOLIDATION_EXECUTE}\`  
**Rows scanned:** ${opts.listings.length}

This script does **not** merge, redirect, pause, or delete Teaching Profiles. \`/listings/{id}\` URLs are unchanged. Unique index is **not** applied.

${TEACHING_PROFILE_SURVIVOR_RULES}

## Counts

| Metric | Count |
|--------|------:|
| Teaching Profiles | ${opts.listings.length} |
| Same-canonical groups (any status) | ${multi.length} |
| ACTIVE collision groups | ${active.length} |
| Unique index safe to apply | ${uniqueIndexSafe ? "yes" : "NO — leave SQL gated"} |
| Leftover CSV tutors (not exploded) | ${opts.leftover.length} |

## What WOULD merge

${dryTable}

## Leftover master CSV (do not explode into extra Teaching Profiles)

${leftoverTable}

Re-run:

\`\`\`bash
npx tsx scripts/dry-run-teaching-profile-consolidation.ts
\`\`\`
`;
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });

  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    writeFileSync(
      OUT,
      skippedDoc("**Reason:** `DATABASE_URL` / `DATABASE_URL_UNPOOLED` was not set."),
      "utf8",
    );
    console.log(`Wrote ${OUT} (skipped: no DATABASE_URL)`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.subjectProfile.findMany({
      select: {
        id: true,
        tutorProfileId: true,
        subject: true,
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
        tutorProfile: { select: { id: true, subjects: true } },
      },
      orderBy: [{ tutorProfileId: "asc" }, { createdAt: "asc" }],
    });

    const listings: ConsolidationListing[] = rows.map((row) => ({
      id: row.id,
      tutorProfileId: row.tutorProfileId,
      status: row.status,
      subject: row.subject,
      title: row.title,
      level: row.level,
      board: row.board,
      qualification: row.qualification,
      syllabusCode: row.syllabusCode,
      rate: row.rate,
      boostUntil: row.boostUntil,
      highlightedUntil: row.highlightedUntil,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      description: row.description,
      headline: row.headline,
    }));

    const leftoverMap = new Map<string, string[]>();
    for (const row of rows) {
      if (leftoverMap.has(row.tutorProfileId)) continue;
      const tags = leftoverCsvTagsNotExploded(
        row.tutorProfile.subjects,
        listings.filter((item) => item.tutorProfileId === row.tutorProfileId),
      ).map((t) => t.tag);
      if (tags.length) leftoverMap.set(row.tutorProfileId, tags);
    }

    writeFileSync(
      OUT,
      reportDoc({
        listings,
        leftover: [...leftoverMap.entries()].map(([tutorProfileId, tags]) => ({
          tutorProfileId,
          tags,
        })),
      }),
      "utf8",
    );

    const groups = groupByCanonicalSubject(listings);
    console.log(
      JSON.stringify(
        {
          out: OUT,
          execute: CONSOLIDATION_EXECUTE,
          rows: listings.length,
          sameCanonicalGroups: multiRowCanonicalGroups(groups).length,
          activeCollisions: activeCanonicalCollisionGroups(groups).length,
          uniqueIndexSafe: canApplyActiveCanonicalUniqueIndex(groups),
        },
        null,
        2,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const safe = message.replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]");
    writeFileSync(
      OUT,
      skippedDoc(`**Reason:** database query failed.\n\n\`\`\`\n${safe.slice(0, 800)}\n\`\`\``),
      "utf8",
    );
    console.error("Dry-run query failed; wrote skipped report.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
