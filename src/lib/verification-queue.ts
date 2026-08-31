/** Admin verification queue helpers. */

export type VerificationQueueRow = {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
  /** True when tutor has a valid active Priority Verification Review entitlement. */
  hasPriorityReview?: boolean;
};

/**
 * Show every pending request, but only the latest resolved row per tutor
 * so approved/rejected history does not repeat identical cards.
 *
 * Pending order (FINAL commercial model):
 * 1. Priority Verification Review entitlement first
 * 2. Within each group: oldest submitted first
 * Resolved rows follow (latest decision per tutor), newest first for history scan.
 */
export function dedupeVerificationQueue<T extends VerificationQueueRow>(rows: T[]): T[] {
  const pending: T[] = [];
  const latestResolved = new Map<string, T>();

  for (const row of rows) {
    if (row.status === "PENDING") {
      pending.push(row);
      continue;
    }
    const existing = latestResolved.get(row.userId);
    if (!existing || row.createdAt > existing.createdAt) {
      latestResolved.set(row.userId, row);
    }
  }

  pending.sort((a, b) => {
    const pa = a.hasPriorityReview ? 1 : 0;
    const pb = b.hasPriorityReview ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const resolved = [...latestResolved.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return [...pending, ...resolved];
}

export function countResolvedVerificationRows<T extends VerificationQueueRow>(rows: T[]) {
  return rows.filter((row) => row.status !== "PENDING").length;
}
