import { createHmac, timingSafeEqual } from "crypto";
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

const legacyBodySchema = z.object({
  tracker: z.string().min(8),
  plan: z
    .enum([
      "STUDENT_PASS",
      "STUDENT_PRO",
      "TUTOR_BASIC",
      "VERIFIED_TUTOR",
      "HIGHLIGHTED_AD",
      "AD_BOOST",
      "EXTRA_ACTIVE",
      "EXTRA_PROFILE_ADS",
      "UNLIMITED_ADS",
    ])
    .optional(),
  kind: z.enum(["subscription", "paper"]).optional(),
});

type SafepayWebhookEvent = {
  type?: string;
  version?: string;
  data?: {
    tracker?: string;
    state?: string;
    metadata?: { order_id?: string; source?: string };
  };
};

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

function webhookSecret() {
  return (process.env.SAFEPAY_WEBHOOK_SECRET || process.env.CRON_SECRET || "").trim();
}

function authorizeBearer(req: Request) {
  const secret = webhookSecret();
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return Boolean(secret && bearer && bearer === secret);
}

/** Safepay dashboard events: HMAC-SHA512 hex in X-SFPY-SIGNATURE over raw body. */
function verifySafepayHmac(rawBody: string, signatureHeader: string | null) {
  const secret = webhookSecret();
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.trim().toLowerCase().replace(/^sha512=/i, "");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(received, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractTrackerFromEvent(event: SafepayWebhookEvent): string | null {
  const raw = event?.data?.tracker;
  if (!raw || typeof raw !== "string") return null;
  return parseTracker(raw);
}

function isPaymentSuccessEvent(type: string | undefined) {
  if (!type) return false;
  return (
    type === "payment.succeeded" ||
    type === "payment:created" ||
    type === "payment.created"
  );
}

async function activateFromTracker(opts: {
  tracker: string;
  planHint?: SubscriptionPlan;
  kind?: "subscription" | "paper";
}) {
  const { state, report, tracker: token } = await fetchSafepayTrackerState(opts.tracker);
  if (!isSafepayTrackerPaid(state, report)) {
    return { ok: false as const, reason: "not_paid" as const, state: state || "unknown", tracker: token };
  }

  if (opts.kind === "paper") {
    const paper = await activatePaidPastPaperPurchase(token);
    return { ok: paper.ok as boolean, kind: "paper" as const, catalogKey: paper.catalogKey, tracker: token };
  }

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: token },
  });
  if (!existing) {
    const paper = await activatePaidPastPaperPurchase(token);
    if (paper.ok) {
      return { ok: true as const, kind: "paper" as const, catalogKey: paper.catalogKey, tracker: token };
    }
    return { ok: false as const, reason: "unknown_order" as const, tracker: token };
  }

  const result = await activatePaidSafepaySubscription({
    tracker: token,
    planHint: (opts.planHint || existing.plan) as SubscriptionPlan | undefined,
  });

  if (!result.ok) {
    return { ok: false as const, reason: result.reason, tracker: token };
  }

  if (existing.userId) {
    await reconcileUserSafepayPayments(existing.userId).catch(() => undefined);
  }

  return {
    ok: true as const,
    kind: "subscription" as const,
    subscriptionId: result.subscription.id,
    alreadyActive: result.alreadyActive,
    tracker: token,
  };
}

/**
 * Safepay dashboard webhooks (HMAC) + legacy Bearer `{ tracker }` callbacks.
 * Dashboard “send test event” failed before because we only accepted Bearer auth.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-sfpy-signature") || req.headers.get("X-SFPY-SIGNATURE");
  const bearerOk = authorizeBearer(req);
  const hmacOk = verifySafepayHmac(rawBody, signature);

  if (!bearerOk && !hmacOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!safepayConfigured()) {
    return NextResponse.json({ error: "Safepay is not configured" }, { status: 503 });
  }

  let json: unknown;
  try {
    json = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await expireStaleSubscriptions().catch(() => undefined);

  // Native Safepay event envelope: { type, data: { tracker, ... } }
  const event = json as SafepayWebhookEvent;
  if (typeof event?.type === "string") {
    if (!isPaymentSuccessEvent(event.type)) {
      // Acknowledge non-activation events (failed/refunded/test refund) so delivery succeeds.
      return NextResponse.json({
        ok: true,
        ignored: true,
        type: event.type,
      });
    }

    const tracker = extractTrackerFromEvent(event);
    if (!tracker) {
      // Dashboard test payloads may omit a real tracker — still ACK so Safepay marks success.
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "missing_tracker",
        type: event.type,
      });
    }

    try {
      const result = await activateFromTracker({ tracker });
      // Always 200 after HMAC so Safepay does not endlessly retry dashboard tests /
      // unknown trackers; activation success is in the body.
      return NextResponse.json({ ...result, type: event.type });
    } catch (err) {
      console.error("Safepay webhook activate error", err);
      return NextResponse.json({ ok: false, error: "activate_failed", type: event.type }, { status: 200 });
    }
  }

  // Legacy internal format: Authorization Bearer + { tracker, plan?, kind? }
  let payload: z.infer<typeof legacyBodySchema>;
  try {
    payload = legacyBodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!bearerOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tracker = parseTracker(payload.tracker);
  const result = await activateFromTracker({
    tracker,
    planHint: payload.plan as SubscriptionPlan | undefined,
    kind: payload.kind,
  });

  if (!result.ok && result.reason === "not_paid") {
    return NextResponse.json(result, { status: 409 });
  }
  if (!result.ok && result.reason === "unknown_order") {
    return NextResponse.json(result, { status: 404 });
  }
  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
