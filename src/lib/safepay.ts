import Safepay from "@sfpy/node-core";

/** Trim + strip wrapping quotes — Vercel pastes often include trailing newlines. */
export function readSafepayEnv(name: "SAFEPAY_API_KEY" | "SAFEPAY_SECRET_KEY") {
  const raw = process.env[name] ?? "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function safepayConfigured() {
  const secret = readSafepayEnv("SAFEPAY_SECRET_KEY");
  const apiKey = readSafepayEnv("SAFEPAY_API_KEY");
  return Boolean(secret && apiKey && !secret.includes("replace") && !apiKey.includes("replace"));
}

export function getSafepayEnv(): "sandbox" | "production" {
  const raw = (process.env.SAFEPAY_ENV || "sandbox").toLowerCase().trim();
  if (raw === "production" || raw === "live") return "production";
  return "sandbox";
}

export function getSafepayApiHost(env: "sandbox" | "production" = getSafepayEnv()) {
  return env === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";
}

/** Safe diagnostics for admin ping — never returns raw secrets. */
export function getSafepayKeyDiagnostics() {
  const rawSecret = process.env.SAFEPAY_SECRET_KEY ?? "";
  const rawApi = process.env.SAFEPAY_API_KEY ?? "";
  const secret = readSafepayEnv("SAFEPAY_SECRET_KEY");
  const apiKey = readSafepayEnv("SAFEPAY_API_KEY");
  const env = getSafepayEnv();
  return {
    env,
    host: getSafepayApiHost(env),
    apiKeyLength: apiKey.length,
    apiKeyLooksPublic: apiKey.startsWith("sec_"),
    secretLength: secret.length,
    secretLooksLikeApiKey: secret.startsWith("sec_"),
    secretHadWhitespace: rawSecret !== secret,
    apiKeyHadWhitespace: rawApi !== apiKey,
  };
}

export function getSafepayClient() {
  const secret = readSafepayEnv("SAFEPAY_SECRET_KEY");
  if (!secret) throw new Error("SAFEPAY_SECRET_KEY is not set");
  if (secret.startsWith("sec_")) {
    throw new Error(
      "SAFEPAY_SECRET_KEY looks like the public API key (sec_…). Paste the Secret/Secure key instead.",
    );
  }

  return new Safepay(secret, {
    authType: "secret",
    host: getSafepayApiHost(),
  });
}

/**
 * Return/cancel URLs must match the browser origin. Production checkout used
 * NEXT_PUBLIC_APP_URL, which is often still http://localhost:3000 on Vercel,
 * so Safepay never sent the shopper back to the live site.
 */
export function checkoutAppUrl(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = forwardedHost.split(",")[0]?.trim();
  if (host) {
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      forwardedProto ||
      (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Safepay session metadata only allows a small allowlist; extra keys fail checkout. */
export function safepayOrderMetadata(orderId: string) {
  return { order_id: orderId };
}

export function safepayPublicError(err: unknown): string {
  const chunks: string[] = [];
  if (err instanceof Error && err.message) chunks.push(err.message);
  const extra = err as {
    data?: { status?: { errors?: unknown; message?: string } };
    status?: { errors?: unknown; message?: string };
  };
  const status = extra?.data?.status || extra?.status;
  if (status?.message) chunks.push(String(status.message));
  if (Array.isArray(status?.errors)) chunks.push(status.errors.map(String).join(" "));
  const raw = chunks.filter(Boolean).join(" ");
  const redacted = raw
    .replace(/sec_[A-Za-z0-9-]+/gi, "sec_…")
    .replace(/track_[A-Za-z0-9-]+/gi, "track_…")
    .replace(/[a-f0-9]{32,}/gi, "[redacted]");

  if (/merchant with api key/i.test(raw) || (/not found/i.test(raw) && /api key/i.test(raw))) {
    const env = getSafepayEnv();
    return `Safepay ${env} did not accept these API keys. Use sandbox keys with SAFEPAY_ENV=sandbox, or live keys with SAFEPAY_ENV=production.`;
  }
  if (
    /unauthorized/i.test(raw) ||
    /missing jwt token/i.test(raw) ||
    /client not permitted/i.test(raw) ||
    /strategies\/secret/i.test(raw)
  ) {
    const env = getSafepayEnv();
    return `Safepay ${env} rejected SAFEPAY_SECRET_KEY (unauthorized). Fix: (1) paste the Secret key — not the sec_ API key — from the same ${env} dashboard, (2) no spaces/newlines in Vercel, (3) do not mix sandbox keys with SAFEPAY_ENV=production. Redeploy, then test again.`;
  }
  if (/unsupported meta key/i.test(raw)) {
    return "Safepay rejected this checkout. Please try again.";
  }
  return (redacted || "Safepay checkout failed").slice(0, 280);
}

export async function createSafepayHostedCheckout(opts: {
  amount: number;
  currency: string;
  orderId: string;
  redirectUrl: string;
  cancelUrl: string;
}) {
  const apiKey = readSafepayEnv("SAFEPAY_API_KEY");
  if (!apiKey) throw new Error("SAFEPAY_API_KEY is not set");
  const safepay = getSafepayClient();
  const env = getSafepayEnv();

  const paymentSession = await safepay.payments.session.setup({
    merchant_api_key: apiKey,
    intent: process.env.SAFEPAY_INTENT || "CYBERSOURCE",
    mode: "payment",
    entry_mode: "raw",
    currency: opts.currency,
    amount: opts.amount,
    metadata: safepayOrderMetadata(opts.orderId),
    include_fees: false,
  });

  const tracker = paymentSession?.data?.tracker?.token as string | undefined;
  if (!tracker) {
    console.error("Safepay session response missing tracker");
    throw new Error("Could not create Safepay session");
  }

  const passport = await safepay.client.passport.create();
  const tbt = (typeof passport?.data === "string" ? passport.data : passport?.data?.token) as
    | string
    | undefined;
  if (!tbt) {
    console.error("Safepay passport response missing token");
    throw new Error("Could not create Safepay auth token");
  }

  const url = safepay.checkout.createCheckoutUrl({
    env,
    tracker,
    tbt,
    source: "hosted",
    order_id: opts.orderId,
    redirect_url: opts.redirectUrl,
    cancel_url: opts.cancelUrl,
  });

  return { url, tracker, env };
}

/** Amount in lowest currency unit (paisa for PKR). */
export function toSafepayAmount(rupees: number) {
  return Math.round(rupees * 100);
}
