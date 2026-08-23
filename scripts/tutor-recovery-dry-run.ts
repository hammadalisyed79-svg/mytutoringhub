/**
 * Dry-run only: count legitimate incomplete tutors eligible for profile-completion outreach.
 * Does NOT send email. Never prints full email addresses.
 *
 * Usage: npx tsx scripts/tutor-recovery-dry-run.ts
 */
import "dotenv/config";
import { selectTutorRecoveryAudience } from "../src/lib/tutor-recovery-audience";

async function main() {
  const result = await selectTutorRecoveryAudience({ limit: 500 });
  console.log(
    JSON.stringify(
      {
        eligibleCount: result.eligibleCount,
        totalScanned: result.totalScanned,
        excluded: result.excluded,
        sample: result.rows.slice(0, 15).map((r) => ({
          emailDomain: r.emailDomain,
          requiredDone: r.requiredDone,
          requiredTotal: r.requiredTotal,
          missingRequired: r.missingRequired,
          profileStarted: r.profileStarted,
        })),
        note: "No emails sent. Bulk send requires an explicit admin action.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
