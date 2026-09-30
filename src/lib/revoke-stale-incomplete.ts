/**
 * Safe revoke of stale unpaid INCOMPLETE Safepay checkouts.
 * Prefer Recover when Safepay shows paid. Missing trackers count as unpaid.
 */
import { prisma } from "@/lib/prisma";
import { safepayConfigured } from "@/lib/safepay";
import { fetchSafepayTrackerState, isSafepayTrackerPaid } from "@/lib/safepay-complete";

export type StaleIncompleteDecision = {
  id: string;
  plan: string;
  createdAt: string;
  action: "revoke" | "skip_paid" | "skip_no_tracker" | "skip_unknown";
  safepayState?: string;
};

export type StaleIncompleteSummary = {
  generatedAt: string;
  mode: "dry-run" | "apply";
  minAgeDays: number;
  candidates: number;
  revoke: number;
  revoked: number;
  skipPaid: number;
  skipNoTracker: number;
  skipUnknown: number;
  decisions: StaleIncompleteDecision[];
};

function trackerMissingError(message: string) {
  return /cannot find tracker|not found|404/i.test(message);
}

export async function revokeStaleIncompleteSubscriptions(opts?: {
  minAgeDays?: number;
  apply?: boolean;
  /** When Safepay is down, still cancel TRACKER_STARTED-style rows (off by default). */
  forceUnpaidWithoutSafepay?: boolean;
}): Promise<StaleIncompleteSummary> {
  const minAgeDays = opts?.minAgeDays ?? 7;
  const apply = Boolean(opts?.apply);
  const cutoff = new Date(Date.now() - minAgeDays * 86400000);

  const rows = await prisma.subscription.findMany({
    where: { status: "INCOMPLETE", createdAt: { lte: cutoff } },
    select: {
      id: true,
      plan: true,
      createdAt: true,
      stripeSubscriptionId: true,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const decisions: StaleIncompleteDecision[] = [];

  for (const row of rows) {
    const tracker = row.stripeSubscriptionId;
    if (!tracker?.startsWith("track_")) {
      decisions.push({
        id: row.id,
        plan: row.plan,
        createdAt: row.createdAt.toISOString(),
        action: "skip_no_tracker",
      });
      continue;
    }

    if (!safepayConfigured()) {
      decisions.push({
        id: row.id,
        plan: row.plan,
        createdAt: row.createdAt.toISOString(),
        action: opts?.forceUnpaidWithoutSafepay ? "revoke" : "skip_unknown",
        safepayState: "safepay_unconfigured",
      });
      continue;
    }

    try {
      const { state, report } = await fetchSafepayTrackerState(tracker);
      if (isSafepayTrackerPaid(state, report)) {
        decisions.push({
          id: row.id,
          plan: row.plan,
          createdAt: row.createdAt.toISOString(),
          action: "skip_paid",
          safepayState: state || "paid",
        });
        continue;
      }
      decisions.push({
        id: row.id,
        plan: row.plan,
        createdAt: row.createdAt.toISOString(),
        action: "revoke",
        safepayState: state || "unpaid",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "fetch_failed";
      decisions.push({
        id: row.id,
        plan: row.plan,
        createdAt: row.createdAt.toISOString(),
        action: trackerMissingError(message) ? "revoke" : "skip_unknown",
        safepayState: message.slice(0, 160),
      });
    }
  }

  const toRevoke = decisions.filter((d) => d.action === "revoke").map((d) => d.id);
  let revoked = 0;
  if (apply && toRevoke.length) {
    const result = await prisma.subscription.updateMany({
      where: { id: { in: toRevoke }, status: "INCOMPLETE" },
      data: { status: "CANCELED" },
    });
    revoked = result.count;
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    minAgeDays,
    candidates: rows.length,
    revoke: toRevoke.length,
    revoked,
    skipPaid: decisions.filter((d) => d.action === "skip_paid").length,
    skipNoTracker: decisions.filter((d) => d.action === "skip_no_tracker").length,
    skipUnknown: decisions.filter((d) => d.action === "skip_unknown").length,
    decisions,
  };
}
