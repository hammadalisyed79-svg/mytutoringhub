import assert from "node:assert/strict";
import { emailVerificationUrl, hashEmailToken } from "./email-verification";

const token = "abc123";
const hashed = hashEmailToken(token);
assert.equal(hashed.length, 64);
assert.notEqual(hashed, hashEmailToken("other"));

const url = emailVerificationUrl(token);
assert.match(url, /\/verify-email\?token=/);
assert.ok(url.includes(encodeURIComponent(token)));

console.log("email-verification.test.ts: ok");
