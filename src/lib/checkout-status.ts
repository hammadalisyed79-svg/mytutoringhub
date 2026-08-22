export type CheckoutNoticeTone = "ok" | "error" | "info";

export function checkoutNotice(
  checkout?: string | null,
  state?: string | null,
): { tone: CheckoutNoticeTone; text: string } | null {
  switch (checkout) {
    case "success":
      return {
        tone: "ok",
        text: "Payment confirmed. Your plan is active. Open Dashboard → View slip for your receipt.",
      };
    case "pending":
      return {
        tone: "info",
        text: state
          ? `Payment is still processing (${friendlyTrackerState(state)}). If you were charged, your plan will activate shortly. You can retry from Pricing if nothing appears on your dashboard.`
          : "Payment is still processing. If you were charged, your plan will activate shortly. You can retry from Pricing if nothing appears on your dashboard.",
      };
    case "error":
      return {
        tone: "error",
        text: "We could not confirm that payment. Please try again. If you were charged, email admin@mytutoringhub.com with the time of payment.",
      };
    case "missing_tracker":
      return {
        tone: "error",
        text: "Checkout did not return a payment reference. Please start again from Pricing.",
      };
    case "safepay_unavailable":
      return {
        tone: "error",
        text: "Online card checkout is not active yet. Email admin@mytutoringhub.com to activate your plan manually, or try again after Safepay goes live.",
      };
    case "unknown_order":
      return {
        tone: "error",
        text: "We could not match that payment to an order. If you were charged, email admin@mytutoringhub.com with the time of payment.",
      };
    case "cancel":
      return {
        tone: "info",
        text: "Checkout was cancelled. No charge was made.",
      };
    default:
      return null;
  }
}

function friendlyTrackerState(state: string) {
  const cleaned = state.replace(/^TRACKER_?/i, "").replace(/_/g, " ").trim();
  if (!cleaned || cleaned.toLowerCase() === "unknown") return "awaiting confirmation";
  return cleaned.toLowerCase();
}
