/**
 * Dry-run / apply past-paper session normalization.
 * Usage:
 *   npx tsx scripts/normalize-past-paper-sessions.ts
 *   npx tsx scripts/normalize-past-paper-sessions.ts --apply
 * Never deletes rows. Preserves sessionRaw on first normalize.
 */
import { prisma } from "../src/lib/prisma";
import {
  classifyPastPaperQuality,
  summarizeQualityClasses,
} from "../src/lib/past-papers/quality-normalize";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || 0);

async function main() {
  const total = await prisma.pastPaper.count();
  console.log(`PastPaper rows: ${total}. Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const batchSize = 1000;
  let cursor: string | undefined;
  let scanned = 0;
  let wouldFix = 0;
  let fixed = 0;
  const samples: { id: string; from: string; to: string }[] = [];
  const allForSummary: {
    session: string | null;
    paperType: string | null;
    documentType: string | null;
    storageKey: string | null;
    fileUrl: string | null;
    subject: string;
    board: string;
    syllabusCode: string | null;
    year: number;
  }[] = [];

  for (;;) {
    const rows = await prisma.pastPaper.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        session: true,
        sessionRaw: true,
        paperType: true,
        documentType: true,
        storageKey: true,
        fileUrl: true,
        subject: true,
        board: true,
        syllabusCode: true,
        year: true,
      },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      allForSummary.push(row);
      const result = classifyPastPaperQuality(row);
      if (!result.sessionNeedsWrite || !result.sessionCanonical) continue;
      wouldFix += 1;
      if (samples.length < 25) {
        samples.push({
          id: row.id,
          from: row.session || "",
          to: result.sessionCanonical,
        });
      }
      if (APPLY) {
        await prisma.pastPaper.update({
          where: { id: row.id },
          data: {
            session: result.sessionCanonical,
            sessionRaw: row.sessionRaw || row.session,
          },
        });
        fixed += 1;
      }
      if (LIMIT > 0 && wouldFix >= LIMIT) break;
    }

    cursor = rows[rows.length - 1]?.id;
    if (LIMIT > 0 && wouldFix >= LIMIT) break;
    if (rows.length < batchSize) break;
  }

  const summary = summarizeQualityClasses(allForSummary);
  console.log(JSON.stringify({ scanned, wouldFix, fixed, summary, samples }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
