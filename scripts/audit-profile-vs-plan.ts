/**
 * Audit Teaching Profiles vs live plan caps (Free=1 / Pro=10).
 * Read-only. Usage: npx tsx scripts/audit-profile-vs-plan.ts [--write]
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  auditProfileVsPlan,
  profileVsPlanHardFailures,
} from "../src/lib/profile-vs-plan-audit";

config();
config({ path: ".env.local" });

async function main() {
  const write = process.argv.includes("--write");
  const audit = await auditProfileVsPlan();
  const hard = profileVsPlanHardFailures(audit);
  console.log(JSON.stringify({ ...audit.totals, hardFailures: hard, samples: audit.samples }, null, 2));
  if (write) {
    const out = resolve("docs/MTH-PROFILE-VS-PLAN-AUDIT.json");
    writeFileSync(out, JSON.stringify({ ...audit, hardFailures: hard }, null, 2));
    console.log("Wrote", out);
  }
  if (!hard.ok) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
