import Safepay from "@sfpy/node-core";

export function safepayConfigured() {
  const secret = process.env.SAFEPAY_SECRET_KEY || "";
  const apiKey = process.env.SAFEPAY_API_KEY || "";
  return Boolean(secret && apiKey && !secret.includes("replace") && !apiKey.includes("replace"));
}

export function getSafepayEnv(): "sandbox" | "production" {
  const raw = (process.env.SAFEPAY_ENV || "sandbox").toLowerCase().trim();
  if (raw === "production" || raw === "live") return "production";
  return "sandbox";
}

export function getSafepayClient() {
  const secret = process.env.SAFEPAY_SECRET_KEY;
  if (!secret) throw new Error("SAFEPAY_SECRET_KEY is not set");

  const env = getSafepayEnv();
  const host =
    env === "production"
      ? "https://api.getsafepay.com"
      : "https://sandbox.api.getsafepay.com";

  return new Safepay(secret, {
    authType: "secret",
    host,
  });
}

/** Amount in lowest currency unit (paisa for PKR). */
export function toSafepayAmount(rupees: number) {
  return Math.round(rupees * 100);
}
