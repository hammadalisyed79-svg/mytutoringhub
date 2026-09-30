/**
 * Expire unpaid Launch-offer Tutor Pro grants (no Safepay payment).
 *
 *   npx tsx scripts/expire-complimentary-tutor-pro.ts
 *   npx tsx scripts/expire-complimentary-tutor-pro.ts --apply
 *   npx tsx scripts/expire-complimentary-tutor-pro.ts --apply --write
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expireComplimentaryTutorPro } from "../src/lib/expire-complimentary-tutor-pro";

config({ path: ".env.local" });
config();

async function main() {
  const apply = process.argv.includes("--apply");
  const write = process.argv.includes("--write");

  const summary = await expireComplimentaryTutorPro({ apply, pauseExcessProfiles: true });
  console.log(
    JSON.stringify(
      {
        mode: summary.mode,
        hardEnd: summary.hardEnd,
        now: summary.now,
        candidates: summary.candidates,
        canceled: summary.canceled,
        profilesPaused: summary.profilesPaused,
        sample: summary.rows.slice(0, 12).map((r) => ({
          name: r.name,
          email: r.email,
          activeTPs: r.activeTeachingProfiles,
          pause: r.pauseListingIds.length,
          keep: r.keepListingId,
          priceId: r.stripePriceId,
          subId: r.stripeSubscriptionId,
        })),
      },
      null,
      2,
    ),
  );

  if (write) {
    const out = resolve("docs/MTH-COMPLIMENTARY-PRO-EXPIRE.json");
    writeFileSync(out, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ wrote: out }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
