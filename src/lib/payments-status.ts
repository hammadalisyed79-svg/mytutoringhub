import { getSafepayEnv, safepayConfigured } from "@/lib/safepay";

export const PAYMENTS_SUPPORT_EMAIL = "admin@mytutoringhub.com";

export type PaymentsMode = "unconfigured" | "sandbox" | "production";

export type PaymentsReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
};

/** True when Safepay production keys are set and checkout can take real payments. */
export function isPaidCheckoutLive() {
  return safepayConfigured() && getSafepayEnv() === "production";
}

export function getPaymentsMode(): PaymentsMode {
  if (!safepayConfigured()) return "unconfigured";
  return getSafepayEnv() === "production" ? "production" : "sandbox";
}

export function getPublicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

export function manualPlanActivationMailto(planName?: string) {
  const subject = planName
    ? `Activate ${planName} on My Tutoring Hub`
    : "Activate my plan on My Tutoring Hub";
  const body =
    "Hi,\n\nI would like to activate a plan on My Tutoring Hub.\n\nMy account email:\nPlan requested:\nPayment method used (bank transfer / etc.):\n\nThank you.";
  return `mailto:${PAYMENTS_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function getPaymentsReadiness(): {
  mode: PaymentsMode;
  checkoutLive: boolean;
  safepayEnv: string;
  appUrl: string;
  checks: PaymentsReadinessCheck[];
} {
  const mode = getPaymentsMode();
  const appUrl = getPublicAppUrl();
  const resendReady = Boolean(process.env.RESEND_API_KEY?.trim()?.startsWith("re_"));

  const checks: PaymentsReadinessCheck[] = [
    {
      id: "safepay_keys",
      label: "Safepay API key and secret are set on Vercel",
      ok: safepayConfigured(),
      hint: "SAFEPAY_API_KEY (sec_…) and SAFEPAY_SECRET_KEY",
    },
    {
      id: "safepay_env",
      label: "SAFEPAY_ENV=production for live card checkout",
      ok: getSafepayEnv() === "production",
      hint: mode === "sandbox" ? "Sandbox works for testing only — Pricing stays in manual mode" : undefined,
    },
    {
      id: "app_url",
      label: "NEXT_PUBLIC_APP_URL points to your live site",
      ok: Boolean(appUrl) && appUrl.includes("mytutoringhub.com") && !appUrl.includes("localhost"),
      hint: "Use https://www.mytutoringhub.com on Vercel Production",
    },
    {
      id: "resend",
      label: "Resend is configured for payment receipts",
      ok: resendReady,
      hint: "RESEND_API_KEY from resend.com",
    },
  ];

  return {
    mode,
    checkoutLive: isPaidCheckoutLive(),
    safepayEnv: getSafepayEnv(),
    appUrl: appUrl || "(not set)",
    checks,
  };
}

export function paymentsModeLabel(mode: PaymentsMode) {
  switch (mode) {
    case "production":
      return "Live — card checkout enabled";
    case "sandbox":
      return "Sandbox — test keys only";
    default:
      return "Not configured — manual activation";
  }
}
