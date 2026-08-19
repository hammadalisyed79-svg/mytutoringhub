/**
 * Lists PDFs already in Cloudflare R2 and upserts PastPaper catalog rows.
 * Same work as Admin → Past papers → Update past papers. Does not download or re-upload files.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { isR2Configured, r2NotConfiguredMessage } = await import("../src/lib/past-papers/r2");
  const { syncPastPapersFromR2, r2PaperListPrefixes } = await import("../src/lib/past-papers/past-paper-sync");
  const { prisma } = await import("../src/lib/prisma");

  if (!isR2Configured()) {
    console.error(r2NotConfiguredMessage());
    process.exit(1);
  }

  const before = await prisma.pastPaper.count();
  console.log(`PastPaper rows before sync: ${before}`);
  console.log(`R2 prefixes: ${r2PaperListPrefixes().join(", ")}`);

  const result = await syncPastPapersFromR2();
  console.log(
    JSON.stringify(
      {
        created: result.created,
        updated: result.updated,
        unchanged: result.unchanged,
        skipped: result.skipped,
        listed: result.listed,
        parsed: result.parsed,
        total: result.total,
        truncated: result.truncated,
        prefixes: result.prefixes,
        warning: result.warning || null,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
