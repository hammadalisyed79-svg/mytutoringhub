import { prisma } from "@/lib/prisma";
import { getSafepayClient, safepayConfigured } from "@/lib/safepay";
import { syncTutorBadges } from "@/lib/subscription";
import { sendEmail, paymentReceiptHtml } from "@/lib/email";
import { deductHubPointsForRedemption } from "@/lib/hub-points";
import { getPlan } from "@/lib/plans";
import { formatSafepayPriceId } from "@/lib/currency";
import type { SubscriptionPlan } from "@/lib/types";

const ADD_ON_PLANS = new Set<SubscriptionPlan>([
  "VERIFIED_TUTOR",
  "HIGHLIGHTED_AD",
  "AD_BOOST",
  "UNLIMITED_ADS",
]);

async function resolveAddOnPeriodEnd(userId: string, plan: SubscriptionPlan, excludeSubId: string) {
  const now = new Date();
  const prior = await prisma.subscription.findFirst({
    where: {
      userId,
      plan,
      status: { in: ["ACTIVE", "TRIALING"] },
      id: { not: excludeSubId },
      currentPeriodEnd: { gt: now },
    },
    orderBy: { currentPeriodEnd: "desc" },
  });

  let base = prior?.currentPeriodEnd && prior.currentPeriodEnd > now ? prior.currentPeriodEnd : now;

  if (plan === "AD_BOOST" || plan === "HIGHLIGHTED_AD") {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { boostUntil: true, highlightedUntil: true },
    });
    if (plan === "AD_BOOST" && profile?.boostUntil && profile.boostUntil > base) {
      base = profile.boostUntil;
    }
    if (plan === "HIGHLIGHTED_AD" && profile?.highlightedUntil && profile.highlightedUntil > base) {
      base = profile.highlightedUntil;
    }
  }

  return new Date(base.getTime() + 30 * 86400000);
}

export async function fetchSafepayTrackerState(tracker: string) {
  const safepay = getSafepayClient();
  const id = tracker.startsWith("track_") ? tracker : `track_${tracker}`;
  const report = await safepay.reporter.payments.fetch(id);
  const data = report?.data ?? report;
  const state = (data?.tracker?.state ||
    data?.state ||
    data?.payment?.state ||
    data?.status ||
    data?.tracker?.status) as string | undefined;
  return { state, report: data, tracker: id };
}

export function isSafepayTrackerPaid(state: string | undefined, report?: unknown) {
  if (state) {
    const s = state.toUpperCase();
    if (
      s === "TRACKER_ENDED" ||
      s === "TRACKER_SUCCEEDED" ||
      s === "SUCCESS" ||
      s === "CAPTURED" ||
      s === "PAID" ||
      s === "COMPLETED"
    ) {
      return true;
    }
  }
  const data = report as {
    tracker?: { end_time?: string; state?: string };
    end_time?: string;
    captured?: boolean;
    payment?: { captured?: boolean; state?: string };
  } | null;
  const trackerState = data?.tracker?.state?.toUpperCase();
  if (
    trackerState === "TRACKER_ENDED" ||
    trackerState === "TRACKER_SUCCEEDED" ||
    trackerState === "SUCCESS" ||
    trackerState === "CAPTURED" ||
    trackerState === "PAID"
  ) {
    return true;
  }
  if (data?.captured === true || data?.payment?.captured === true) return true;
  return false;
}

export async function activatePaidSafepaySubscription(opts: {
  tracker: string;
  planHint?: SubscriptionPlan | null;
  billingHint?: "monthly" | "annual";
}) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: opts.tracker },
  });
  const plan = (existing?.plan || opts.planHint) as SubscriptionPlan | undefined;
  if (!existing || !plan) return { ok: false as const, reason: "unknown_order" as const };

  if (["ACTIVE", "TRIALING"].includes(existing.status)) {
    const user = await prisma.user.findUnique({ where: { id: existing.userId }, select: { role: true } });
    if (user?.role === "TUTOR") await syncTutorBadges(existing.userId);
    return { ok: true as const, subscription: existing, alreadyActive: true };
  }

  // Use billingPeriod stored on the record, or fall back to the hint, then monthly.
  const billing = (existing.billingPeriod as "monthly" | "annual" | null) ?? opts.billingHint ?? "monthly";
  const periodMs = billing === "annual" ? 365 * 86400000 : 30 * 86400000;
  const periodEnd = ADD_ON_PLANS.has(plan)
    ? await resolveAddOnPeriodEnd(existing.userId, plan, existing.id)
    : new Date(Date.now() + periodMs);
  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      billingPeriod: billing,
    },
  });

  await prisma.subscription.updateMany({
    where: {
      userId: updated.userId,
      plan,
      status: "INCOMPLETE",
      id: { not: updated.id },
    },
    data: { status: "CANCELED" },
  });

  const user = await prisma.user.findUnique({ where: { id: updated.userId } });
  if (user?.role === "TUTOR") {
    await syncTutorBadges(user.id);
  }

  if (updated.pointsRedeemedPkr > 0) {
    const planName = getPlan(plan)?.name || plan;
    await deductHubPointsForRedemption({
      userId: updated.userId,
      points: updated.pointsRedeemedPkr,
      subscriptionId: updated.id,
      planName,
    });
  }

  if (user?.email) {
    const planName = getPlan(plan)?.name || plan;
    const amountLabel = formatSafepayPriceId(updated.stripePriceId);
    try {
      await sendEmail({
        to: user.email,
        subject: `Receipt: ${planName} — My Tutoring Hub`,
        html: paymentReceiptHtml({
          name: user.name,
          planName,
          amountLabel,
          periodEnd,
          receiptId: updated.id,
        }),
      });
    } catch (emailErr) {
      console.error("Payment receipt email failed", emailErr);
    }
  }

  return { ok: true as const, subscription: updated, alreadyActive: false };
}

export async function activatePaidPastPaperPurchase(tracker: string) {
  const existing = await prisma.pastPaperPurchase.findUnique({ where: { tracker } });
  if (!existing) return { ok: false as const };
  if (existing.status !== "PAID") {
    await prisma.pastPaperPurchase.update({
      where: { id: existing.id },
      data: { status: "PAID" },
    });
  }
  return { ok: true as const, catalogKey: existing.catalogKey };
}

export async function reconcileUserSafepayPaperPurchases(userId: string) {
  if (!safepayConfigured()) return [];

  const pending = await prisma.pastPaperPurchase.findMany({
    where: {
      userId,
      status: "PENDING",
      tracker: { startsWith: "track_" },
      createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const unlocked: string[] = [];
  for (const row of pending) {
    const tracker = row.tracker;
    if (!tracker) continue;
    try {
      const { state, report, tracker: token } = await fetchSafepayTrackerState(tracker);
      if (!isSafepayTrackerPaid(state, report)) continue;
      const result = await activatePaidPastPaperPurchase(token);
      if (result.ok) unlocked.push(result.catalogKey);
    } catch (err) {
      console.error("Safepay paper reconcile failed", tracker, err);
    }
  }
  return unlocked;
}

/** Activate any INCOMPLETE Safepay checkouts that already succeeded at the processor. */
export async function reconcileUserSafepayPayments(userId: string) {
  if (!safepayConfigured()) return [];

  const pending = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ["INCOMPLETE", "CANCELED"] },
      stripeSubscriptionId: { startsWith: "track_" },
      createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const activated: string[] = [];
  for (const row of pending) {
    const tracker = row.stripeSubscriptionId;
    if (!tracker) continue;
    try {
      const { state, report, tracker: token } = await fetchSafepayTrackerState(tracker);
      if (!isSafepayTrackerPaid(state, report)) continue;
      const result = await activatePaidSafepaySubscription({
        tracker: token,
        planHint: row.plan as SubscriptionPlan,
      });
      if (result.ok) activated.push(result.subscription.id);
    } catch (err) {
      console.error("Safepay reconcile failed", tracker, err);
    }
  }
  return activated;
}

/** Mark subscriptions past currentPeriodEnd as canceled and refresh tutor visibility. */
export async function expireStaleSubscriptions(now = new Date()) {
  const stale = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { lt: now },
    },
    select: { id: true, userId: true },
  });
  if (stale.length === 0) return 0;

  await prisma.subscription.updateMany({
    where: { id: { in: stale.map((row) => row.id) } },
    data: { status: "CANCELED" },
  });

  const tutorUserIds = new Set<string>();
  for (const row of stale) {
    const user = await prisma.user.findUnique({
      where: { id: row.userId },
      select: { role: true },
    });
    if (user?.role === "TUTOR") tutorUserIds.add(row.userId);
  }
  for (const userId of tutorUserIds) {
    await syncTutorBadges(userId).catch(() => undefined);
  }
  return stale.length;
}
