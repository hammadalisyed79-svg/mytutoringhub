/**
 * Recovery campaign preparation dry-run.
 * Does NOT send email. Never prints full email addresses.
 *
 * Usage: npx tsx scripts/tutor-recovery-campaign-prep.ts
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import {
  prepareTutorRecoveryCampaign,
  redactRecoveryCampaignForReport,
} from "../src/lib/tutor-recovery-campaign";

async function main() {
  const prep = await prepareTutorRecoveryCampaign();
  const redacted = redactRecoveryCampaignForReport(prep);

  // Internal admin artifact — still no full emails
  writeFileSync(
    "tmp_tutor_recovery_campaign_prep.json",
    JSON.stringify(redacted, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(redacted, null, 2));
  console.log("\nSEND STATUS: NOT SENT");
  console.log("Wrote tmp_tutor_recovery_campaign_prep.json (no private emails).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
