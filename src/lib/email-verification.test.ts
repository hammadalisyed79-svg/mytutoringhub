import assert from "node:assert/strict";
import { emailVerificationUrl, hashEmailToken } from "./email-verification";

const token = "abc123";
const hashed = hashEmailToken(token);
assert.equal(hashed.length, 64);
assert.notEqual(hashed, hashEmailToken("other"));

const url = emailVerificationUrl(token);
assert.match(url, /\/api\/auth\/verify-email\?token=/);
assert.match(url, encodeURIComponent(token));

console.log("email-verification.test.ts: ok");
