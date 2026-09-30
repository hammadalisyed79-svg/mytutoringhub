/**
 * Revoke stale INCOMPLETE Safepay checkouts that are unpaid.
 * Default is dry-run. Never force-completes.
 *
 * Usage:
 *   npx tsx scripts/revoke-stale-incomplete.ts
 *   npx tsx scripts/revoke-stale-incomplete.ts --apply --min-age-days=7 --write
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { revokeStaleIncompleteSubscriptions } from "../src/lib/revoke-stale-incomplete";

config();
config({ path: ".env.local" });

function argNum(name: string, fallback: number) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function main() {
  const summary = await revokeStaleIncompleteSubscriptions({
    minAgeDays: argNum("min-age-days", 7),
    apply: process.argv.includes("--apply"),
    forceUnpaidWithoutSafepay: process.argv.includes("--force-unpaid"),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (process.argv.includes("--write")) {
    const out = resolve("docs/MTH-REVOKE-STALE-INCOMPLETE.json");
    writeFileSync(out, JSON.stringify(summary, null, 2));
    console.log("Wrote", out);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
