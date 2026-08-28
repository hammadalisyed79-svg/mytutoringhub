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
  const result = await runOnboardingDigest();
  return NextResponse.json({ ...result, subjectProfileCaps: caps });
}
