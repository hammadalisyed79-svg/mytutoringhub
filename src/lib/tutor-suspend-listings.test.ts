import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");
const suspendLib = readFileSync(join(root, "lib/tutor-suspend-listings.ts"), "utf8");
const adminActions = readFileSync(join(root, "lib/admin-actions.ts"), "utf8");

assert.match(suspendLib, /subjectProfile\.updateMany/);
assert.match(suspendLib, /tutorAd\.updateMany/);
assert.match(suspendLib, /active: false, forceActive: false/);
assert.match(suspendLib, /status: "PAUSED"/);

assert.match(adminActions, /pauseTutorPublicSurfaces/);
assert.match(adminActions, /Cannot force-activate a listing while the tutor account is suspended/);
assert.match(adminActions, /Cannot restore listings while the tutor account is suspended/);
assert.match(
  adminActions,
  /Cannot restore a Teaching Profile while the tutor account is suspended/,
);

// report_suspend must also pause legacy TutorAd rows
const reportSuspendIdx = adminActions.indexOf('case "report_suspend"');
assert.ok(reportSuspendIdx > 0);
const reportBlock = adminActions.slice(reportSuspendIdx, reportSuspendIdx + 1800);
assert.match(reportBlock, /tutorAd\.updateMany/);
assert.match(reportBlock, /status: "PAUSED"/);

console.log("tutor-suspend-listings.test.ts: ok");
