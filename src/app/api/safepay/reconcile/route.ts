import { NextResponse } from "next/server";
import {
  expireStaleSubscriptions,
  reconcileAllPendingSafepayPayments,
} from "@/lib/safepay-complete";
import { safepayConfigured } from "@/lib/safepay";

export const runtime = "nodejs";

/**
 * Hourly Safepay reconcile — backup when customers never return from hosted checkout.
 * Protect with CRON_SECRET or SAFEPAY_RECONCILE_SECRET (Authorization: Bearer …).
 */
export async function GET(req: Request) {
  const secret =
    process.env.CRON_SECRET ||
    process.env.SAFEPAY_RECONCILE_SECRET ||
    process.env.SAFEPAY_WEBHOOK_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!secret || bearer !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!safepayConfigured()) {
    return NextResponse.json({ ok: false, reason: "safepay_unconfigured" }, { status: 503 });
  }

  const expired = await expireStaleSubscriptions();
  const result = await reconcileAllPendingSafepayPayments();

  return NextResponse.json({
    ok: true,
    expiredSubscriptions: expired,
    ...result,
  });
}
