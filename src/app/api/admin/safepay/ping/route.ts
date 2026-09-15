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
  getSafepayKeyDiagnostics,
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
  const keys = getSafepayKeyDiagnostics();
  const base = {
    ...readiness,
    safepayConfigured: safepayConfigured(),
    safepayEnv: getSafepayEnv(),
    appUrl: getPublicAppUrl() || null,
    checkoutLive: isPaidCheckoutLive(),
    keys,
  };

  if (!safepayConfigured()) {
    return NextResponse.json({
      ...base,
      ok: false,
      message: "Safepay keys are missing or still placeholders.",
    });
  }

  if (keys.secretLooksLikeApiKey) {
    return NextResponse.json({
      ...base,
      ok: false,
      message:
        "SAFEPAY_SECRET_KEY starts with sec_ — that is the public API key. Paste the Secret/Secure key from the same production dashboard (Account → Developers).",
    });
  }

  try {
    const safepay = getSafepayClient();
    await safepay.client.passport.create();
    return NextResponse.json({
      ...base,
      ok: true,
      message: isPaidCheckoutLive()
        ? getSafepayEnv() === "production"
          ? "Safepay production keys verified. Card checkout is live."
          : "Safepay keys verified in sandbox. Pay with test cards on Pricing (no real money)."
        : "Safepay keys verified in sandbox. Set SAFEPAY_ENV=production for live checkout.",
    });
  } catch (err) {
    const tip =
      keys.env === "production"
        ? " Confirm these are PRODUCTION keys (live dashboard Account → Developers), not sandbox, and that merchant onboarding/KYC is approved. Then Redeploy Production."
        : " Confirm these are sandbox keys with SAFEPAY_ENV=sandbox.";
    return NextResponse.json({
      ...base,
      ok: false,
      message: `${safepayPublicError(err)}${tip}`,
    });
  }
}
