/**
 * Read-only Teaching Profile migration preview.
 *
 * Groups existing SubjectProfile rows by tutorProfileId + canonical subject
 * (alias-aware). Does not insert, update, delete, merge, pause, or redirect.
 *
 * Usage: npx tsx scripts/preview-teaching-profile-migration.ts
 * Writes: docs/MTH-TEACHING-PROFILES-PHASE1-PREVIEW.md
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { canonicalTeachingSubject } from "../src/lib/teaching-profile-subject";
import {
  capabilitiesFromScalarRow,
  capabilityGroupKey,
  type SubjectProfileCapabilityKind,
} from "../src/lib/teaching-profile-capabilities";

config();
config({ path: ".env.local" });

const OUT = join(process.cwd(), "docs", "MTH-TEACHING-PROFILES-PHASE1-PREVIEW.md");

type ListingRow = {
  id: string;
  tutorProfileId: string;
  subject: string;
  status: string;
  level: string;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
  rate: number;
  boostUntil: Date | null;
  highlightedUntil: Date | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type CapabilityKind = SubjectProfileCapabilityKind;

type Group = {
  tutorProfileId: string;
  canonical: string;
  key: string;
  matched: boolean;
  source: string;
  rows: ListingRow[];
};

const QUERY_SQL = `SELECT
  id,
  "tutorProfileId",
  subject,
  status,
  level,
  board,
  qualification,
  "syllabusCode",
  rate,
  "boostUntil",
  "highlightedUntil",
  title,
  "createdAt",
  "updatedAt"
FROM "SubjectProfile"`;

const EXPECTED_COLUMNS = [
  "id",
  "tutorProfileId",
  "subject",
  "status",
  "level",
  "board",
  "qualification",
  "syllabusCode",
  "rate",
  "boostUntil",
  "highlightedUntil",
  "title",
  "createdAt",
  "updatedAt",
];

function isoStamp() {
  return new Date().toISOString();
}

function uniqSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function capabilitySets(rows: ListingRow[]) {
  const buckets: Record<CapabilityKind, Set<string>> = {
    LEVEL: new Set(),
    BOARD: new Set(),
    QUALIFICATION: new Set(),
    SYLLABUS_CODE: new Set(),
  };
  const labels: Record<CapabilityKind, string[]> = {
    LEVEL: [],
    BOARD: [],
    QUALIFICATION: [],
    SYLLABUS_CODE: [],
  };
  for (const row of rows) {
    for (const cap of capabilitiesFromScalarRow(row)) {
      const key = capabilityGroupKey(cap.value, cap.kind);
      if (!key || buckets[cap.kind].has(key)) continue;
      buckets[cap.kind].add(key);
      labels[cap.kind].push(cap.value);
    }
  }
  return labels;
}

function mdEscape(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function skippedDoc(reason: string) {
  return `# Teaching Profiles Phase 1 — migration preview

**Status:** LIVE COUNTS SKIPPED  
**Generated:** ${isoStamp()}  
**Mode:** read-only (no writes)

${reason}

This script does **not** delete, merge, redirect, or pause listings. Production data was not changed.

## Query (run when DATABASE_URL is available)

\`\`\`sql
${QUERY_SQL}
\`\`\`

Expected columns: ${EXPECTED_COLUMNS.map((c) => `\`${c}\``).join(", ")}.

Grouping (in process, not SQL): \`tutorProfileId\` + \`canonicalTeachingSubject(subject).key\` from \`src/lib/teaching-profile-subject.ts\` (alias-aware; exam-family prefixes such as GCSE Maths collapse to Mathematics).

## Counts this file would populate

| Metric | Column |
|--------|--------|
| Total \`SubjectProfile\` rows | integer |
| ACTIVE / PAUSED / other | integers |
| Distinct tutors with ≥1 listing | integer |
| Tutors whose listings are all different canonical subjects | integer |
| Tutors with 2+ rows of the **same** canonical subject (any status) | integer |
| Same, **ACTIVE rows only** (blocks the partial unique index) | integer |
| Same-subject groups where boards would union | integer |
| Same-subject groups where levels would union | integer |
| Same-subject groups where qualifications would union | integer |
| Same-subject groups where syllabus codes would union | integer |
| Groups with two Boost windows | integer |
| Can apply \`SubjectProfile_active_tutor_canonical_uidx\` now? | yes / no |

Re-run:

\`\`\`bash
npx tsx scripts/preview-teaching-profile-migration.ts
\`\`\`
`;
}

function reportDoc(opts: {
  rows: ListingRow[];
  groups: Group[];
  now: Date;
}) {
  const { rows, groups, now } = opts;
  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const paused = rows.filter((r) => r.status === "PAUSED").length;
  const other = rows.length - active - paused;
  const tutors = new Set(rows.map((r) => r.tutorProfileId));

  const multi = groups.filter((g) => g.rows.length >= 2);
  const multiActive = groups.filter((g) => g.rows.filter((r) => r.status === "ACTIVE").length >= 2);

  const tutorsWithAnyMulti = new Set(multi.map((g) => g.tutorProfileId));
  const tutorsWithActiveMulti = new Set(multiActive.map((g) => g.tutorProfileId));
  const tutorsSingleCanonicalOnly = [...tutors].filter((id) => !tutorsWithAnyMulti.has(id)).length;

  const boardUnion = multi.filter((g) => capabilitySets(g.rows).BOARD.length >= 2);
  const levelUnion = multi.filter((g) => capabilitySets(g.rows).LEVEL.length >= 2);
  const qualUnion = multi.filter((g) => capabilitySets(g.rows).QUALIFICATION.length >= 2);
  const codeUnion = multi.filter((g) => capabilitySets(g.rows).SYLLABUS_CODE.length >= 2);

  const boostConflicts = multi.filter((g) => {
    const live = g.rows.filter((r) => r.boostUntil && r.boostUntil > now);
    return live.length >= 2;
  });

  const highlightConflicts = multi.filter((g) => {
    const live = g.rows.filter((r) => r.highlightedUntil && r.highlightedUntil > now);
    return live.length >= 2;
  });

  const canApplyUnique = multiActive.length === 0;
  const aliasCollisions = groups.filter((g) => {
    const rawKeys = new Set(g.rows.map((r) => r.subject.trim().toLowerCase()));
    return g.rows.length >= 2 && rawKeys.size >= 2;
  });

  const rateSpreads = multi.filter((g) => {
    const rates = [...new Set(g.rows.map((r) => r.rate))];
    return rates.length >= 2;
  });

  const groupTable = (list: Group[], limit = 80) => {
    if (!list.length) return "_None._\n";
    const shown = list.slice(0, limit);
    const lines = [
      "| TutorProfile | Canonical | Rows | ACTIVE | Raw subjects | Levels | Boards | Quals | Codes | Listing ids | Boost until |",
      "|---|---|---:|---:|---|---|---|---|---|---|---|",
      ...shown.map((g) => {
        const caps = capabilitySets(g.rows);
        const activeN = g.rows.filter((r) => r.status === "ACTIVE").length;
        const boosts = g.rows
          .filter((r) => r.boostUntil)
          .map((r) => r.boostUntil!.toISOString().slice(0, 10))
          .join(", ");
        return `| \`${g.tutorProfileId}\` | ${mdEscape(g.canonical)} | ${g.rows.length} | ${activeN} | ${mdEscape(uniqSorted(g.rows.map((r) => r.subject)).join(", "))} | ${mdEscape(caps.LEVEL.join(", ") || "—")} | ${mdEscape(caps.BOARD.join(", ") || "—")} | ${mdEscape(caps.QUALIFICATION.join(", ") || "—")} | ${mdEscape(caps.SYLLABUS_CODE.join(", ") || "—")} | ${g.rows.map((r) => `\`${r.id}\``).join(" ")} | ${boosts || "—"} |`;
      }),
    ];
    if (list.length > limit) lines.push(`\n_… ${list.length - limit} more groups omitted._`);
    return `${lines.join("\n")}\n`;
  };

  return `# Teaching Profiles Phase 1 — migration preview

**Status:** LIVE COUNTS (read-only)  
**Generated:** ${isoStamp()}  
**Rows scanned:** ${rows.length}

This report **does not** delete, merge, redirect, or pause listings. No \`UPDATE\` / \`DELETE\` / \`INSERT\` ran against \`SubjectProfile\`.

Canonical grouping uses \`canonicalTeachingSubject()\` (\`src/lib/teaching-profile-subject.ts\`): aliases (\`Maths\` → \`Mathematics\`), catalog resolve, exam-family prefixes (\`GCSE Maths\` → \`Mathematics\`), trailing syllabus codes (\`Chemistry 5070\` → \`Chemistry\`). Custom unmatched labels stay verbatim (case-insensitive key).

## Totals

| Metric | Count |
|--------|------:|
| \`SubjectProfile\` rows | ${rows.length} |
| ACTIVE | ${active} |
| PAUSED | ${paused} |
| Other status | ${other} |
| Distinct \`tutorProfileId\` with ≥1 listing | ${tutors.size} |
| Tutors with no same-canonical duplicate rows | ${tutorsSingleCanonicalOnly} |
| Tutors with 1 listing total | ${[...tutors].filter((id) => rows.filter((r) => r.tutorProfileId === id).length === 1).length} |
| Tutors with 2+ listings (any subjects) | ${[...tutors].filter((id) => rows.filter((r) => r.tutorProfileId === id).length >= 2).length} |

## Same canonical subject (Phase 9 consolidation candidates)

These are **not** merged. They are the rows a future consolidation tool would group.

| Metric | Count |
|--------|------:|
| Same-canonical groups with 2+ rows (any status) | ${multi.length} |
| Tutors in those groups | ${tutorsWithAnyMulti.size} |
| Same-canonical groups with 2+ **ACTIVE** rows | ${multiActive.length} |
| Tutors blocked from the ACTIVE partial unique index | ${tutorsWithActiveMulti.size} |
| Groups where raw subject strings differ but canonical key matches (alias / exam-family) | ${aliasCollisions.length} |

### Groups that would need capability union

A group “needs merging” on a dimension when 2+ distinct values exist across its rows (after skipping empty / All levels).

| Dimension | Groups with 2+ distinct values |
|-----------|-------------------------------:|
| Levels | ${levelUnion.length} |
| Boards | ${boardUnion.length} |
| Qualifications | ${qualUnion.length} |
| Syllabus codes | ${codeUnion.length} |
| Disagreeing listing rates | ${rateSpreads.length} |
| Two+ live Boost windows | ${boostConflicts.length} |
| Two+ live Highlight windows | ${highlightConflicts.length} |

## Unique index applicability

Partial unique index (not Prisma \`@@unique\`):

\`\`\`sql
CREATE UNIQUE INDEX "SubjectProfile_active_tutor_canonical_uidx"
  ON "SubjectProfile" ("tutorProfileId", (lower(btrim("canonicalSubject"))))
  WHERE status = 'ACTIVE' AND btrim("canonicalSubject") <> '';
\`\`\`

**Can apply now against this database?** ${canApplyUnique ? "YES — zero ACTIVE same-canonical collisions." : "NO — wait for Phase 9 consolidation. The SQL migration skips the index when collisions exist."}

Paused + ACTIVE of the same canonical subject remains allowed (product uniqueness is active-only). Pause-then-recreate should **reuse** the paused row in Phase 2/3 writers (not implemented here).

## Same-canonical groups (any status, 2+ rows)

${groupTable(multi)}

## ACTIVE collisions (block the unique index)

${groupTable(multiActive)}

## Groups whose boards would union

${groupTable(boardUnion)}

## Groups whose levels would union

${groupTable(levelUnion)}

## Query used

\`\`\`sql
${QUERY_SQL}
\`\`\`

Expected columns: ${EXPECTED_COLUMNS.map((c) => `\`${c}\``).join(", ")}.

Re-run:

\`\`\`bash
npx tsx scripts/preview-teaching-profile-migration.ts
\`\`\`
`;
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });

  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    writeFileSync(OUT, skippedDoc("**Reason:** `DATABASE_URL` / `DATABASE_URL_UNPOOLED` was not set in `.env` or `.env.local`."), "utf8");
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
      },
      orderBy: [{ tutorProfileId: "asc" }, { updatedAt: "desc" }],
    });

    const groupMap = new Map<string, Group>();
    for (const row of rows) {
      const canon = canonicalTeachingSubject(row.subject);
      const mapKey = `${row.tutorProfileId}::${canon.key || foldFallback(row.subject)}`;
      const existing = groupMap.get(mapKey);
      if (existing) {
        existing.rows.push(row);
        continue;
      }
      groupMap.set(mapKey, {
        tutorProfileId: row.tutorProfileId,
        canonical: canon.canonical || row.subject,
        key: canon.key,
        matched: canon.matched,
        source: canon.source,
        rows: [row],
      });
    }

    const groups = [...groupMap.values()].sort((a, b) => b.rows.length - a.rows.length || a.canonical.localeCompare(b.canonical));
    writeFileSync(OUT, reportDoc({ rows, groups, now: new Date() }), "utf8");

    const multi = groups.filter((g) => g.rows.length >= 2);
    const multiActive = groups.filter((g) => g.rows.filter((r) => r.status === "ACTIVE").length >= 2);
    console.log(
      JSON.stringify(
        {
          out: OUT,
          rows: rows.length,
          tutors: new Set(rows.map((r) => r.tutorProfileId)).size,
          sameCanonicalGroups: multi.length,
          activeCollisions: multiActive.length,
          uniqueIndexSafe: multiActive.length === 0,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const safe = message.replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted]").replace(/DATABASE_URL[^\n]*/gi, "[redacted]");
    writeFileSync(
      OUT,
      skippedDoc(
        `**Reason:** database query failed (connection or schema). No data was written.\n\n\`\`\`\n${safe.slice(0, 800)}\n\`\`\``,
      ),
      "utf8",
    );
    console.error("Preview query failed; wrote skipped report.");
    console.error(safe.slice(0, 400));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

function foldFallback(subject: string) {
  return subject.trim().toLowerCase() || "_empty";
}

main();
