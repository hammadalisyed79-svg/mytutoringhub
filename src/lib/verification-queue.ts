/** Admin verification queue helpers. */

export type VerificationQueueRow = {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
};

/**
 * Show every pending request, but only the latest resolved row per tutor
 * so approved/rejected history does not repeat identical cards.
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

  return [...pending, ...latestResolved.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function countResolvedVerificationRows<T extends VerificationQueueRow>(rows: T[]) {
  return rows.filter((row) => row.status !== "PENDING").length;
}
