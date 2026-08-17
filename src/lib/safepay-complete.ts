import { prisma } from "@/lib/prisma";
import { getSafepayClient, safepayConfigured } from "@/lib/safepay";
import { syncTutorBadges } from "@/lib/subscription";
import { sendEmail, paymentReceiptHtml } from "@/lib/email";
import { getPlan } from "@/lib/plans";
import { formatSafepayPriceId } from "@/lib/currency";
import type { SubscriptionPlan } from "@/lib/types";

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
      s.includes("ENDED") ||
      s.includes("SUCCESS") ||
      s.includes("CAPTURE") ||
      s.includes("PAID") ||
      s.includes("COMPLETE")
    ) {
      return true;
    }
  }
  const data = report as {
    tracker?: { end_time?: string; state?: string };
    end_time?: string;
    captured?: boolean;
  } | null;
  if (data?.tracker?.end_time || data?.end_time || data?.captured) return true;
  return false;
}

export async function activatePaidSafepaySubscription(opts: {
  tracker: string;
  planHint?: SubscriptionPlan | null;
}) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: opts.tracker },
  });
  const plan = (existing?.plan || opts.planHint) as SubscriptionPlan | undefined;
  if (!existing || !plan) return { ok: false as const, reason: "unknown_order" as const };

  if (["ACTIVE", "TRIALING"].includes(existing.status)) {
    return { ok: true as const, subscription: existing, alreadyActive: true };
  }

  const periodEnd = new Date(Date.now() + 30 * 86400000);
  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
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

  if (user?.email) {
    const planName = getPlan(plan)?.name || plan;
    const amountLabel = formatSafepayPriceId(updated.stripePriceId);
    try {
      await sendEmail({
        to: user.email,
        subject: `Receipt: ${planName} — MyTutoringHub`,
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
