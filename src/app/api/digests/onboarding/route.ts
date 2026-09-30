import { NextResponse } from "next/server";
import { runOnboardingDigest } from "@/lib/email-sequences";
import { expireStaleSubscriptions } from "@/lib/safepay-complete";

export const runtime = "nodejs";

/**
 * Student nurture emails: backup tutor picks + upgrade nudge (2–4 days after verify).
 * Protect with CRON_SECRET (Authorization: Bearer …) or DIGEST_SECRET query param.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.DIGEST_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!secret || bearer !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireStaleSubscriptions();
  const { enforceAllSubjectProfileCaps } = await import("@/lib/subject-profile-entitlements");
  const caps = await enforceAllSubjectProfileCaps();
  const { auditProfileVsPlan, profileVsPlanHardFailures } = await import(
    "@/lib/profile-vs-plan-audit"
  );
  const profileAudit = await auditProfileVsPlan({ sampleLimit: 20 });
  const hard = profileVsPlanHardFailures(profileAudit);
  const { revokeStaleIncompleteSubscriptions } = await import("@/lib/revoke-stale-incomplete");
  const incompleteCleanup = await revokeStaleIncompleteSubscriptions({
    minAgeDays: 7,
    apply: true,
  });
  const result = await runOnboardingDigest();
  return NextResponse.json({
    ...result,
    subjectProfileCaps: caps,
    profileVsPlan: {
      totals: profileAudit.totals,
      hardFailures: hard,
      samples: profileAudit.samples,
    },
    incompleteCleanup: {
      candidates: incompleteCleanup.candidates,
      revoke: incompleteCleanup.revoke,
      revoked: incompleteCleanup.revoked,
      skipPaid: incompleteCleanup.skipPaid,
    },
  });
}
