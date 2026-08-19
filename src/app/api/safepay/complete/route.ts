import { NextResponse } from "next/server";
import { checkoutAppUrl, safepayConfigured } from "@/lib/safepay";
import {
  activatePaidPastPaperPurchase,
  activatePaidSafepaySubscription,
  fetchSafepayTrackerState,
  isSafepayTrackerPaid,
} from "@/lib/safepay-complete";
import type { SubscriptionPlan } from "@/lib/types";

export const runtime = "nodejs";

function pricingRedirect(appUrl: string, checkout: string, planHint?: SubscriptionPlan | null, extras?: Record<string, string>) {
  const params = new URLSearchParams({ checkout });
  if (planHint) params.set("plan", planHint);
  for (const [key, value] of Object.entries(extras || {})) {
    params.set(key, value);
  }
  return `${appUrl}/pricing?${params.toString()}`;
}

/**
 * Safepay redirects here after hosted checkout with ?tracker=track_...
 */
export async function GET(req: Request) {
  const appUrl = checkoutAppUrl(req);
  const { searchParams } = new URL(req.url);
  const tracker = searchParams.get("tracker");
  const planHint = searchParams.get("plan") as SubscriptionPlan | null;
  const kind = searchParams.get("kind");

  if (!tracker) {
    return NextResponse.redirect(
      kind === "paper"
        ? `${appUrl}/past-papers?checkout=missing_tracker`
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
        return NextResponse.redirect(
          `${appUrl}/past-papers?checkout=success&key=${encodeURIComponent(paper.catalogKey)}`,
        );
      }
    }

    if (!isSafepayTrackerPaid(state, report)) {
      const dest = kind === "paper" ? "/past-papers" : "/pricing";
      return NextResponse.redirect(
        kind === "paper"
          ? `${appUrl}${dest}?checkout=pending&tracker=${encodeURIComponent(token)}&state=${encodeURIComponent(state || "unknown")}`
          : pricingRedirect(appUrl, "pending", planHint, {
              tracker: token,
              state: state || "unknown",
            }),
      );
    }

    const result = await activatePaidSafepaySubscription({ tracker: token, planHint });
    if (!result.ok) {
      return NextResponse.redirect(pricingRedirect(appUrl, "unknown_order", planHint));
    }

    return NextResponse.redirect(`${appUrl}/receipt/${result.subscription.id}`);
  } catch (err) {
    console.error("Safepay complete error", err);
    return NextResponse.redirect(
      kind === "paper" ? `${appUrl}/past-papers?checkout=error` : pricingRedirect(appUrl, "error", planHint),
    );
  }
}
