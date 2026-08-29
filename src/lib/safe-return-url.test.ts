import assert from "node:assert/strict";
import { loginUrlWithNext, safeReturnPath } from "./safe-return-url";

assert.equal(safeReturnPath("/ads/new?subject=Math"), "/ads/new?subject=Math");
assert.equal(safeReturnPath("/support"), "/support");
assert.equal(safeReturnPath("https://evil.com"), "/dashboard");
assert.equal(safeReturnPath("//evil.com"), "/dashboard");
assert.equal(safeReturnPath("\\evil"), "/dashboard");
assert.equal(safeReturnPath(null), "/dashboard");
assert.equal(safeReturnPath(["/messages", "/other"]), "/messages");
assert.equal(loginUrlWithNext("/ads/new?subject=X"), "/login?next=%2Fads%2Fnew%3Fsubject%3DX");

console.log("safe-return-url.test.ts: ok");
