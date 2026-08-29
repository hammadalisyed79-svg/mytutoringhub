/**
 * Lightweight product funnel events. Wire to an analytics provider later;
 * today logs in non-production and is a stable call site for growth metrics.
 */
export type ProductEventName =
  | "signup_complete"
  | "email_verified"
  | "tutor_contact_started"
  | "tutor_contact_limit_hit"
  | "enquiry_reveal"
  | "checkout_started"
  | "listing_viewed"
  | "search_results_shown"
  | "search_zero_results"
  | "become_tutor"
  | "switch_account_role";

export function trackProductEvent(
  name: ProductEventName,
  props?: Record<string, string | number | boolean | null | undefined>,
) {
  const clean: Record<string, string | number | boolean> = {};
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null) continue;
      clean[key] = value;
    }
  }
  if (process.env.NODE_ENV !== "production") {
    console.info("[product-event]", name, clean);
  }
}
