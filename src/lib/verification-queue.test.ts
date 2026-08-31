import assert from "node:assert/strict";
import { dedupeVerificationQueue } from "@/lib/verification-queue";

const t = (id: string, userId: string, status: string, createdAt: string, priority = false) => ({
  id,
  userId,
  status,
  createdAt: new Date(createdAt),
  hasPriorityReview: priority,
  verified: false,
});

const rows = [
  t("n1", "u1", "PENDING", "2026-08-01T10:00:00Z", false),
  t("n2", "u2", "PENDING", "2026-08-01T08:00:00Z", false),
  t("p1", "u3", "PENDING", "2026-08-02T10:00:00Z", true),
  t("p2", "u4", "PENDING", "2026-08-01T12:00:00Z", true),
  t("a1", "u5", "APPROVED", "2026-08-03T10:00:00Z", false),
];

const sorted = dedupeVerificationQueue(rows);
assert.equal(sorted[0].id, "p2", "oldest priority first");
assert.equal(sorted[1].id, "p1", "newer priority second");
assert.equal(sorted[2].id, "n2", "oldest normal after priority");
assert.equal(sorted[3].id, "n1", "newer normal last among pending");
assert.equal(sorted[4].id, "a1");

// Priority flag must not invent verification status
assert.equal(sorted[0].hasPriorityReview, true);
assert.ok(sorted.every((r) => r.status === "PENDING" || r.status === "APPROVED"));

console.log("verification-queue.test.ts: ok");
