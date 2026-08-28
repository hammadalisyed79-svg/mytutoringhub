import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safepayConfigured } from "@/lib/safepay";
import {
  activatePaidSafepaySubscription,
  fetchSafepayTrackerState,
  isSafepayTrackerPaid,
} from "@/lib/safepay-complete";
import type { SubscriptionPlan } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";

function parseTracker(raw: string) {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("tracker");
    if (fromQuery) return fromQuery;
  } catch {
    /* not a URL */
  }
  const match = trimmed.match(/track_[a-zA-Z0-9-]+/);
  return match?.[0] || trimmed;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!safepayConfigured()) {
    return NextResponse.json({ error: "Safepay is not configured" }, { status: 503 });
  }

  const body = z
    .object({
      tracker: z.string().min(8),
      plan: z
        .enum([
          "STUDENT_PASS",
          "STUDENT_PRO",
          "TUTOR_BASIC",
          "VERIFIED_TUTOR",
          "HIGHLIGHTED_AD",
          "AD_BOOST",
          "EXTRA_PROFILE_ADS",
          "UNLIMITED_ADS",
        ])
        .optional(),
    })
    .parse(await req.json());

  const tracker = parseTracker(body.tracker);
  const { state, report, tracker: token } = await fetchSafepayTrackerState(tracker);
  if (!isSafepayTrackerPaid(state, report)) {
    return NextResponse.json(
      { error: `Safepay has not marked this payment complete (${state || "unknown"}).` },
      { status: 409 },
    );
  }

  let existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: token },
  });
  if (!existing) {
    if (!body.plan) {
      return NextResponse.json(
        {
          error:
            "No checkout record for this tracker. Start checkout from Plans & pricing, or contact admin@mytutoringhub.com with your Safepay receipt.",
        },
        { status: 404 },
      );
    }
    existing = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        plan: body.plan,
        status: "INCOMPLETE",
        stripeSubscriptionId: token,
      },
    });
  } else if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "This payment belongs to another account" }, { status: 403 });
  }

  const result = await activatePaidSafepaySubscription({
    tracker: token,
    planHint: (body.plan || existing.plan) as SubscriptionPlan,
  });
  if (!result.ok) {
    return NextResponse.json({ error: "Could not activate payment" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, receiptId: result.subscription.id });
}
