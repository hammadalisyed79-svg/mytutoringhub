import { NextResponse } from "next/server";
import { safepayConfigured } from "@/lib/safepay";
import {
  activatePaidSafepaySubscription,
  fetchSafepayTrackerState,
  isSafepayTrackerPaid,
} from "@/lib/safepay-complete";
import type { SubscriptionPlan } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Safepay redirects here after hosted checkout with ?tracker=track_...
 * We verify payment status then activate the matching subscription for 30 days.
 */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const tracker = searchParams.get("tracker");
  const planHint = searchParams.get("plan") as SubscriptionPlan | null;

  if (!tracker) {
    return NextResponse.redirect(`${appUrl}/pricing?checkout=missing_tracker`);
  }

  if (!safepayConfigured()) {
    return NextResponse.redirect(`${appUrl}/pricing?checkout=safepay_unavailable`);
  }

  try {
    const state = await fetchSafepayTrackerState(tracker);
    if (!isSafepayTrackerPaid(state)) {
      return NextResponse.redirect(
        `${appUrl}/pricing?checkout=pending&tracker=${encodeURIComponent(tracker)}&state=${encodeURIComponent(state || "unknown")}`,
      );
    }

    const result = await activatePaidSafepaySubscription({ tracker, planHint });
    if (!result.ok) {
      return NextResponse.redirect(`${appUrl}/pricing?checkout=unknown_order`);
    }

    return NextResponse.redirect(`${appUrl}/receipt/${result.subscription.id}`);
  } catch (err) {
    console.error("Safepay complete error", err);
    return NextResponse.redirect(`${appUrl}/pricing?checkout=error`);
  }
}
