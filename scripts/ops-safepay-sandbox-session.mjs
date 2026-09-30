/**
 * Non-charge Safepay sandbox session probe (creates hosted checkout URL only).
 * Usage: npx tsx scripts/ops-safepay-sandbox-session.mjs
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const {
  createSafepayHostedCheckout,
  getSafepayEnv,
  safepayConfigured,
  safepayPublicError,
} = await import("../src/lib/safepay.ts");

const out = {
  configured: safepayConfigured(),
  env: getSafepayEnv(),
  session: null,
  error: null,
};

if (!out.configured) {
  out.error = "SAFEPAY keys missing";
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
}

try {
  const result = await createSafepayHostedCheckout({
    amount: 100,
    currency: "PKR",
    orderId: `ops-sandbox-ping-${Date.now()}`,
    redirectUrl: "https://www.mytutoringhub.com/pricing?checkout=ok",
    cancelUrl: "https://www.mytutoringhub.com/pricing?checkout=cancel",
  });
  out.session = {
    ok: true,
    keys: Object.keys(result || {}),
    hasCheckoutUrl: Boolean(result?.checkoutUrl || result?.url),
    checkoutUrlPreview: String(result?.checkoutUrl || result?.url || "").slice(0, 120),
  };
} catch (err) {
  out.error = safepayPublicError(err);
  out.session = { ok: false };
}

console.log(JSON.stringify(out, null, 2));
process.exit(out.session?.ok ? 0 : 1);
