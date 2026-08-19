import assert from "node:assert/strict";
import {
  checkoutAppUrl,
  getSafepayApiHost,
  getSafepayEnv,
  safepayOrderMetadata,
  safepayPublicError,
} from "./safepay";

const originalEnv = process.env.SAFEPAY_ENV;
try {
  process.env.SAFEPAY_ENV = "sandbox";
  assert.equal(getSafepayEnv(), "sandbox");
  assert.equal(getSafepayApiHost(), "https://sandbox.api.getsafepay.com");

  process.env.SAFEPAY_ENV = "production";
  assert.equal(getSafepayEnv(), "production");
  assert.equal(getSafepayApiHost(), "https://api.getsafepay.com");

  process.env.SAFEPAY_ENV = "live";
  assert.equal(getSafepayEnv(), "production");

  process.env.SAFEPAY_ENV = "SANDBOX";
  assert.equal(getSafepayEnv(), "sandbox");
} finally {
  if (originalEnv == null) delete process.env.SAFEPAY_ENV;
  else process.env.SAFEPAY_ENV = originalEnv;
}

const localReq = new Request("http://localhost:3000/api/safepay/checkout", {
  headers: { host: "localhost:3000" },
});
assert.equal(checkoutAppUrl(localReq), "http://localhost:3000");

const prodReq = new Request("http://127.0.0.1/api/safepay/checkout", {
  headers: {
    host: "localhost:3000",
    "x-forwarded-host": "www.mytutoringhub.com",
    "x-forwarded-proto": "https",
  },
});
assert.equal(checkoutAppUrl(prodReq), "https://www.mytutoringhub.com");

const meta = safepayOrderMetadata("mth_paper_1");
assert.deepEqual(Object.keys(meta).sort(), ["order_id"]);
assert.equal(meta.order_id, "mth_paper_1");

const leaked = safepayPublicError(
  new Error("merchant with api key 'sec_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' not found"),
);
assert.equal(leaked.includes("sec_aaaaaaaa"), false);
assert.match(leaked, /SAFEPAY_ENV=sandbox/);

const metaErr = safepayPublicError(new Error("unsupported meta key catalog_key"));
assert.equal(metaErr.includes("catalog_key"), false);
assert.match(metaErr, /rejected this checkout/i);

console.log("safepay.test.ts ok");
