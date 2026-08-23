import "dotenv/config";
import { getTutorSupplyOverview, getTutorSupplyGapReport } from "../src/lib/tutor-supply-metrics";

async function main() {
  const overview = await getTutorSupplyOverview();
  const gap = await getTutorSupplyGapReport(12);
  console.log(JSON.stringify({ overview, gap }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
