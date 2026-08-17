import { NextResponse } from "next/server";
import { safepayConfigured } from "@/lib/safepay";
import {
  activatePaidSafepaySubscription,
  fetchSafepayTrackerState,
  isSafepayTrackerPaid,
} from "@/lib/safepay-complete";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Safepay redirects here after hosted checkout with ?tracker=track_...
 */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const tracker = searchParams.get("tracker");
  const planHint = searchParams.get("plan") as SubscriptionPlan | null;
  const kind = searchParams.get("kind");

  if (!tracker) {
    return NextResponse.redirect(
      kind === "paper"
        ? `${appUrl}/past-papers?checkout=missing_tracker`
        : `${appUrl}/pricing?checkout=missing_tracker`,
    );
  }

  if (!safepayConfigured()) {
    return NextResponse.redirect(
      kind === "paper"
        ? `${appUrl}/past-papers?checkout=safepay_unavailable`
        : `${appUrl}/pricing?checkout=safepay_unavailable`,
    );
  }

  try {
    const { state, report, tracker: token } = await fetchSafepayTrackerState(tracker);
    if (isSafepayTrackerPaid(state, report)) {
      const paperPurchase = await prisma.pastPaperPurchase.findUnique({ where: { tracker: token } });
      if (paperPurchase) {
        if (paperPurchase.status !== "PAID") {
          await prisma.pastPaperPurchase.update({
            where: { id: paperPurchase.id },
            data: { status: "PAID" },
          });
        }
        return NextResponse.redirect(
          `${appUrl}/past-papers?checkout=success&key=${encodeURIComponent(paperPurchase.catalogKey)}`,
        );
      }
    }

    if (!isSafepayTrackerPaid(state, report)) {
      const dest = kind === "paper" ? "/past-papers" : "/pricing";
      return NextResponse.redirect(
        `${appUrl}${dest}?checkout=pending&tracker=${encodeURIComponent(token)}&state=${encodeURIComponent(state || "unknown")}`,
      );
    }

    const result = await activatePaidSafepaySubscription({ tracker: token, planHint });
    if (!result.ok) {
      return NextResponse.redirect(`${appUrl}/pricing?checkout=unknown_order`);
    }

    return NextResponse.redirect(`${appUrl}/receipt/${result.subscription.id}`);
  } catch (err) {
    console.error("Safepay complete error", err);
    return NextResponse.redirect(
      kind === "paper" ? `${appUrl}/past-papers?checkout=error` : `${appUrl}/pricing?checkout=error`,
    );
  }
}
