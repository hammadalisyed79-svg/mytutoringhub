import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getPaymentsReadiness,
  getPublicAppUrl,
  isPaidCheckoutLive,
} from "@/lib/payments-status";
import {
  getSafepayClient,
  getSafepayEnv,
  safepayConfigured,
  safepayPublicError,
} from "@/lib/safepay";

export const runtime = "nodejs";

/** Admin-only: verify Safepay keys and return readiness JSON. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const readiness = getPaymentsReadiness();
  const base = {
    ...readiness,
    safepayConfigured: safepayConfigured(),
    safepayEnv: getSafepayEnv(),
    appUrl: getPublicAppUrl() || null,
    checkoutLive: isPaidCheckoutLive(),
  };

  if (!safepayConfigured()) {
    return NextResponse.json({
      ...base,
      ok: false,
      message: "Safepay keys are missing or still placeholders.",
    });
  }

  try {
    const safepay = getSafepayClient();
    await safepay.client.passport.create();
    return NextResponse.json({
      ...base,
      ok: true,
      message: isPaidCheckoutLive()
        ? "Safepay production keys verified. Card checkout is live."
        : "Safepay keys verified in sandbox. Set SAFEPAY_ENV=production for live checkout.",
    });
  } catch (err) {
    return NextResponse.json({
      ...base,
      ok: false,
      message: safepayPublicError(err),
    });
  }
}
