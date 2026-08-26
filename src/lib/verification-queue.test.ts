import assert from "node:assert/strict";
import { dedupeVerificationQueue, countResolvedVerificationRows } from "./verification-queue";

const userA = "user-a";
const userB = "user-b";
const t1 = new Date("2026-08-23T14:44:00Z");
const t2 = new Date("2026-08-23T14:40:00Z");

const rows = dedupeVerificationQueue([
  { id: "1", userId: userA, status: "APPROVED", createdAt: t1 },
  { id: "2", userId: userA, status: "APPROVED", createdAt: t2 },
  { id: "3", userId: userB, status: "PENDING", createdAt: new Date("2026-08-24T10:00:00Z") },
]);

assert.equal(rows.length, 2, "duplicate approved rows collapse to one per tutor");
assert.equal(rows.find((row) => row.userId === userA)?.id, "1", "keeps newest approved row");
assert.ok(rows.some((row) => row.status === "PENDING"), "pending rows stay visible");

const hidden =
  countResolvedVerificationRows([
    { id: "1", userId: userA, status: "APPROVED", createdAt: t1 },
    { id: "2", userId: userA, status: "APPROVED", createdAt: t2 },
  ]) -
  countResolvedVerificationRows(dedupeVerificationQueue([
    { id: "1", userId: userA, status: "APPROVED", createdAt: t1 },
    { id: "2", userId: userA, status: "APPROVED", createdAt: t2 },
  ]));
assert.equal(hidden, 1);

console.log("verification-queue tests passed");
