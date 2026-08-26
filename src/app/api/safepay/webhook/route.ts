import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { safepayConfigured } from "@/lib/safepay";
import {
  activatePaidPastPaperPurchase,
  activatePaidSafepaySubscription,
  expireStaleSubscriptions,
  fetchSafepayTrackerState,
  isSafepayTrackerPaid,
  reconcileUserSafepayPayments,
} from "@/lib/safepay-complete";
import type { SubscriptionPlan } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  tracker: z.string().min(8),
  plan: z
    .enum([
      "STUDENT_PASS",
      "STUDENT_PRO",
      "TUTOR_BASIC",
      "VERIFIED_TUTOR",
      "HIGHLIGHTED_AD",
      "AD_BOOST",
      "UNLIMITED_ADS",
    ])
    .optional(),
  kind: z.enum(["subscription", "paper"]).optional(),
});

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

function authorizeWebhook(req: Request) {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET || process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return Boolean(secret && bearer === secret);
}

/**
 * Safepay server callback — activates paid checkouts when the customer never returns to /complete.
 * Protect with SAFEPAY_WEBHOOK_SECRET (Authorization: Bearer …).
 */
export async function POST(req: Request) {
  if (!authorizeWebhook(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!safepayConfigured()) {
    return NextResponse.json({ error: "Safepay is not configured" }, { status: 503 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await expireStaleSubscriptions();

  const tracker = parseTracker(payload.tracker);
  const { state, report, tracker: token } = await fetchSafepayTrackerState(tracker);
  if (!isSafepayTrackerPaid(state, report)) {
    return NextResponse.json(
      { ok: false, reason: "not_paid", state: state || "unknown" },
      { status: 409 },
    );
  }

  if (payload.kind === "paper") {
    const paper = await activatePaidPastPaperPurchase(token);
    return NextResponse.json({ ok: paper.ok, kind: "paper", catalogKey: paper.catalogKey });
  }

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: token },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, reason: "unknown_order" }, { status: 404 });
  }

  const result = await activatePaidSafepaySubscription({
    tracker: token,
    planHint: (payload.plan || existing.plan) as SubscriptionPlan | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 });
  }

  if (existing?.userId) {
    await reconcileUserSafepayPayments(existing.userId).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    subscriptionId: result.subscription.id,
    alreadyActive: result.alreadyActive,
  });
}
