/**
 * GA4 / Google Ads conversion event catalog (launch closeout).
 * No PII (email, phone, name, message body, ID docs).
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export type ConversionEventName =
  | "student_registration"
  | "tutor_search"
  | "teaching_profile_view"
  | "student_tutor_contact"
  | "student_request_created"
  | "student_pass_purchase"
  | "student_pro_purchase"
  | "past_paper_purchase"
  | "tutor_registration"
  | "tutor_email_verified"
  | "tutor_profile_completed"
  | "teaching_profile_activated"
  | "tutor_enquiry_received"
  | "tutor_pro_activation"
  | "listing_boost_purchase"
  | "priority_verification_purchase";

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

/** Map internal plan IDs to purchase conversion events. */
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

export const GOOGLE_ADS_PRIMARY_STUDENT = [
  "student_tutor_contact",
  "student_request_created",
  "student_pass_purchase",
  "student_pro_purchase",
] as const;

export const GOOGLE_ADS_PRIMARY_COMMERCIAL = ["past_paper_purchase"] as const;

export const GOOGLE_ADS_SECONDARY = [
  "student_registration",
  "tutor_search",
  "teaching_profile_view",
  "tutor_registration",
  "tutor_email_verified",
  "tutor_profile_completed",
  "teaching_profile_activated",
  "tutor_enquiry_received",
] as const;

export const GOOGLE_ADS_TUTOR_GROWTH_PRIMARY = [
  "tutor_profile_completed",
  "teaching_profile_activated",
  "tutor_pro_activation",
  "listing_boost_purchase",
] as const;
