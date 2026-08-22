import { NextResponse } from "next/server";
import { runOnboardingDigest } from "@/lib/email-sequences";

export const runtime = "nodejs";

/**
 * Student nurture emails: backup tutor picks + upgrade nudge (2–4 days after verify).
 * Protect with CRON_SECRET (Authorization: Bearer …) or DIGEST_SECRET query param.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET || process.env.DIGEST_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = url.searchParams.get("secret");

  if (!secret || (bearer !== secret && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runOnboardingDigest();
  return NextResponse.json(result);
}
