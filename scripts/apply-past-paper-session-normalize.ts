/**
 * Apply high-confidence session normalization in bulk (preserves sessionRaw).
 * Run after dry-run review: npx tsx scripts/apply-past-paper-session-normalize.ts
 */
import { prisma } from "../src/lib/prisma";
import { normalizePastPaperSession } from "../src/lib/past-papers/quality-normalize";

async function main() {
  const groups = await prisma.pastPaper.groupBy({ by: ["session"], _count: true });
  const preview: { from: string; to: string; count: number }[] = [];
  let fixed = 0;

  for (const g of groups) {
    const from = g.session;
    if (from == null) continue;
    const n = normalizePastPaperSession(from);
    if (n.confidence !== "high" || !n.canonical || n.canonical === from) continue;
    preview.push({ from, to: n.canonical, count: g._count });
    const result = await prisma.$executeRaw`
      UPDATE "PastPaper"
      SET "sessionRaw" = COALESCE("sessionRaw", session),
          session = ${n.canonical}
      WHERE session = ${from}
    `;
    fixed += Number(result);
  }

  preview.sort((a, b) => b.count - a.count);
  const remaining = await prisma.pastPaper.groupBy({
    by: ["session"],
    _count: true,
    orderBy: { _count: { session: "desc" } },
    take: 20,
  });
  console.log(JSON.stringify({ fixed, preview, remainingSessions: remaining }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
