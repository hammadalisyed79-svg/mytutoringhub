import assert from "node:assert/strict";
import { checkRateLimit } from "@/lib/auth-rate-limit";

{
  const key = `test-${Date.now()}`;
  assert.equal(checkRateLimit(key, 2, 60_000).ok, true);
  assert.equal(checkRateLimit(key, 2, 60_000).ok, true);
  const blocked = checkRateLimit(key, 2, 60_000);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.ok(blocked.retryAfterSec > 0);
}

console.log("auth-rate-limit.test.ts: ok");
