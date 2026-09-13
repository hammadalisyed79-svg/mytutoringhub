import { NextResponse } from "next/server";
import { checkoutAppUrl, safepayConfigured } from "@/lib/safepay";
import {
  activatePaidPastPaperPurchase,
  activatePaidSafepaySubscription,
  fetchSafepayTrackerState,
  isSafepayTrackerPaid,
} from "@/lib/safepay-complete";
import { parsePurchaseNotes } from "@/lib/purchase-context";
import { safeReturnPath } from "@/lib/safe-return-url";
import type { SubscriptionPlan } from "@/lib/types";

export const runtime = "nodejs";

function pricingRedirect(
  appUrl: string,
  checkout: string,
  planHint?: SubscriptionPlan | null,
  extras?: Record<string, string>,
) {
  const params = new URLSearchParams({ checkout });
  if (planHint) params.set("plan", planHint);
  for (const [key, value] of Object.entries(extras || {})) {
    params.set(key, value);
  }
  return `${appUrl}/pricing?${params.toString()}`;
}

function withCheckoutFlag(path: string, checkout: string, plan?: string | null) {
  const safe = safeReturnPath(path, "");
  if (!safe) return null;
  const joiner = safe.includes("?") ? "&" : "?";
  const planQs = plan ? `&plan=${encodeURIComponent(plan)}` : "";
  return `${safe}${joiner}checkout=${encodeURIComponent(checkout)}${planQs}`;
}

/**
 * Safepay redirects here after hosted checkout with ?tracker=track_...
 */
export async function GET(req: Request) {
  const appUrl = checkoutAppUrl(req);
  const { searchParams } = new URL(req.url);
  const tracker = searchParams.get("tracker");
  const planHint = searchParams.get("plan") as SubscriptionPlan | null;
  const billingHint = searchParams.get("billing") as "monthly" | "annual" | null;
  const kind = searchParams.get("kind");
  const returnHint = searchParams.get("returnUrl");

  if (!tracker) {
    const fallback = returnHint ? withCheckoutFlag(returnHint, "missing_tracker", planHint) : null;
    return NextResponse.redirect(
      kind === "paper"
        ? `${appUrl}/past-papers?checkout=missing_tracker`
        : fallback
          ? `${appUrl}${fallback}`
          : pricingRedirect(appUrl, "missing_tracker", planHint),
    );
  }

  if (!safepayConfigured()) {
    return NextResponse.redirect(
      kind === "paper"
        ? `${appUrl}/past-papers?checkout=safepay_unavailable`
        : pricingRedirect(appUrl, "safepay_unavailable", planHint),
    );
  }

  try {
    const { state, report, tracker: token } = await fetchSafepayTrackerState(tracker);
    if (isSafepayTrackerPaid(state, report)) {
      const paper = await activatePaidPastPaperPurchase(token);
      if (paper.ok) {
        const params = new URLSearchParams({
          checkout: "success",
          key: paper.catalogKey,
        });
        if (paper.downloadToken) params.set("token", paper.downloadToken);
        return NextResponse.redirect(`${appUrl}/past-papers?${params.toString()}`);
      }
    }

    if (!isSafepayTrackerPaid(state, report)) {
      const failReturn = returnHint
        ? withCheckoutFlag(returnHint, "pending", planHint)
        : null;
      return NextResponse.redirect(
        kind === "paper"
          ? `${appUrl}/past-papers?checkout=pending&tracker=${encodeURIComponent(token)}&state=${encodeURIComponent(state || "unknown")}`
          : failReturn
            ? `${appUrl}${failReturn}&tracker=${encodeURIComponent(token)}`
            : pricingRedirect(appUrl, "pending", planHint, {
                tracker: token,
                state: state || "unknown",
              }),
      );
    }

    const result = await activatePaidSafepaySubscription({
      tracker: token,
      planHint,
      billingHint: billingHint ?? undefined,
    });
    if (!result.ok) {
      return NextResponse.redirect(pricingRedirect(appUrl, "unknown_order", planHint));
    }

    const notes = parsePurchaseNotes(result.subscription.notes);
    const journey =
      (returnHint && safeReturnPath(returnHint, "")) ||
      notes.returnUrl ||
      "";
    // Prefer receipt so the user sees confirmation + a continue CTA for the journey.
    const receiptUrl = new URL(`${appUrl}/receipt/${result.subscription.id}`);
    if (journey) receiptUrl.searchParams.set("continue", journey);
    return NextResponse.redirect(receiptUrl.toString());
  } catch (err) {
    console.error("Safepay complete error", err);
    const errReturn = returnHint ? withCheckoutFlag(returnHint, "error", planHint) : null;
    return NextResponse.redirect(
      kind === "paper"
        ? `${appUrl}/past-papers?checkout=error`
        : errReturn
          ? `${appUrl}${errReturn}`
          : pricingRedirect(appUrl, "error", planHint),
    );
  }
}
