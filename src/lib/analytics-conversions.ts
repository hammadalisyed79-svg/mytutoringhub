/**
 * GA4 / Google Ads conversion event catalog (revenue intelligence closeout).
 * No PII (email, phone, name, message body, ID docs).
 *
 * Prefer exact catalog names. Legacy aliases (tutor_search, tutor_enquiry_received)
 * remain for Ads continuity where noted.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export type ConversionEventName =
  // Student
  | "student_registration"
  | "student_search"
  | "search_results_view"
  | "tutor_search" // legacy alias of student_search (Ads)
  | "teaching_profile_view"
  | "contact_tutor_attempt"
  | "student_tutor_contact"
  | "student_contact_limit_reached"
  | "student_pass_upsell_view"
  | "student_pass_checkout_started"
  | "student_pass_purchase"
  | "student_pro_upsell_view"
  | "student_pro_checkout_started"
  | "student_pro_purchase"
  | "student_request_attempt"
  | "student_request_created"
  | "past_paper_view"
  | "past_paper_download"
  | "past_paper_quota_exhausted"
  | "past_paper_purchase"
  | "successful_match_student_response"
  // Tutor
  | "tutor_registration"
  | "tutor_email_verified"
  | "tutor_profile_completed"
  | "teaching_profile_activated"
  | "enquiry_reveal"
  | "enquiry_reveal_limit_reached"
  | "tutor_pro_upsell_view"
  | "tutor_pro_checkout_started"
  | "tutor_pro_activation"
  | "listing_boost_checkout_started"
  | "listing_boost_purchase"
  | "priority_verification_checkout_started"
  | "priority_verification_purchase"
  | "tutor_enquiry_received" // paired with student contact (Ads)
  | "successful_match_tutor_response"
  // Conversation
  | "new_conversation"
  | "first_tutor_reply"
  | "first_student_reply"
  // Zero-friction purchase funnel (aliases / complements of existing events)
  | "product_view"
  | "upgrade_prompt_view"
  | "purchase_intent"
  | "checkout_redirected"
  | "payment_success"
  | "payment_failed"
  | "entitlement_activated";

export type ConversionParams = Record<string, string | number | boolean | null | undefined>;

const BLOCKED_KEYS = /email|phone|password|name|message|body|doc|cnic|passport|token|secret/i;

export function sanitizeConversionParams(params?: ConversionParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (BLOCKED_KEYS.test(key)) continue;
    if (typeof value === "string" && value.length > 120) {
      out[key] = value.slice(0, 120);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Map internal plan IDs to purchase conversion events. Complimentary → value 0. */
export function purchaseEventForPlan(
  plan: string,
  opts?: { complimentary?: boolean; value?: number },
): { event: ConversionEventName; value: number } | null {
  const complimentary = Boolean(opts?.complimentary);
  const value = complimentary ? 0 : Number(opts?.value ?? 0);
  switch (plan) {
    case "STUDENT_PASS":
      return { event: "student_pass_purchase", value };
    case "STUDENT_PRO":
      return { event: "student_pro_purchase", value };
    case "TUTOR_BASIC":
      return { event: "tutor_pro_activation", value };
    case "AD_BOOST":
      return { event: "listing_boost_purchase", value };
    case "VERIFIED_TUTOR":
      return { event: "priority_verification_purchase", value };
    default:
      return null;
  }
}

/** Checkout-started GA event for a plan (never a purchase). */
export function checkoutStartedEventForPlan(plan: string): ConversionEventName | null {
  switch (plan) {
    case "STUDENT_PASS":
      return "student_pass_checkout_started";
    case "STUDENT_PRO":
      return "student_pro_checkout_started";
    case "TUTOR_BASIC":
      return "tutor_pro_checkout_started";
    case "AD_BOOST":
      return "listing_boost_checkout_started";
    case "VERIFIED_TUTOR":
      return "priority_verification_checkout_started";
    default:
      return null;
  }
}

/**
 * Safe purchase attribution params for GA (snake_case).
 * Deduplicate client-side with transaction_id.
 */
export function purchaseAttributionParams(opts: {
  product: string;
  plan: string;
  billingPeriod: string;
  currency: string;
  actualPaidValue: number;
  transactionId: string;
  paymentSource: "safepay" | "manual" | "complimentary" | "promo" | "stripe";
}): ConversionParams {
  return {
    product: opts.product,
    plan: opts.plan,
    billing_period: opts.billingPeriod,
    currency: opts.currency,
    actual_paid_value: opts.actualPaidValue,
    value: opts.actualPaidValue,
    transaction_id: opts.transactionId,
    payment_source: opts.paymentSource,
  };
}

/** Parse safepay_PKR_1999 style ids into major units. */
export function parseSafepayStoredAmount(stripePriceId: string | null | undefined): {
  currency: string;
  major: number;
  complimentary: boolean;
} {
  if (!stripePriceId || /promo|complimentary|manual/i.test(stripePriceId)) {
    return { currency: "PKR", major: 0, complimentary: true };
  }
  const match = /^safepay_([A-Z]{3})_(\d+)$/.exec(stripePriceId);
  if (!match) return { currency: "PKR", major: 0, complimentary: true };
  const currency = match[1];
  const minor = Number(match[2]);
  const major =
    currency === "PKR" || currency === "JPY" || currency === "KRW" ? minor : minor / 100;
  return { currency, major, complimentary: major <= 0 };
}

export const GOOGLE_ADS_PRIMARY_STUDENT = [
  "student_tutor_contact",
  "student_request_created",
  "student_pass_purchase",
  "student_pro_purchase",
] as const;

export const GOOGLE_ADS_PRIMARY_COMMERCIAL = ["past_paper_purchase"] as const;

export const GOOGLE_ADS_SECONDARY = [
  "student_registration",
  "student_search",
  "search_results_view",
  "tutor_search",
  "teaching_profile_view",
  "tutor_registration",
  "tutor_email_verified",
  "tutor_profile_completed",
  "teaching_profile_activated",
  "tutor_enquiry_received",
  "student_contact_limit_reached",
  "student_pass_upsell_view",
  "enquiry_reveal_limit_reached",
  "tutor_pro_upsell_view",
  "past_paper_quota_exhausted",
  "student_pro_upsell_view",
  "successful_match_student_response",
  "successful_match_tutor_response",
  "new_conversation",
  "first_tutor_reply",
  "first_student_reply",
] as const;

export const GOOGLE_ADS_TUTOR_GROWTH_PRIMARY = [
  "tutor_profile_completed",
  "teaching_profile_activated",
  "tutor_pro_activation",
  "listing_boost_purchase",
] as const;
