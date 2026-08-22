import { getSafepayEnv, safepayConfigured } from "@/lib/safepay";

/** True when Safepay production keys are set and checkout can take real payments. */
export function isPaidCheckoutLive() {
  return safepayConfigured() && getSafepayEnv() === "production";
}

export const PAYMENTS_SUPPORT_EMAIL = "admin@mytutoringhub.com";

export function manualPlanActivationMailto(planName?: string) {
  const subject = planName
    ? `Activate ${planName} on My Tutoring Hub`
    : "Activate my plan on My Tutoring Hub";
  const body =
    "Hi,\n\nI would like to activate a plan on My Tutoring Hub.\n\nMy account email:\nPlan requested:\nPayment method used (bank transfer / etc.):\n\nThank you.";
  return `mailto:${PAYMENTS_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
