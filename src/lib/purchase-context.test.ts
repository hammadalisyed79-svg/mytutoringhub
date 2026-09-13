import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  encodePurchaseNotes,
  parsePurchaseNotes,
  purchaseContinueCta,
  NON_STACKABLE_CHECKOUT_PLANS,
} from "@/lib/purchase-context";
import {
  encodeCheckoutNotes,
  parseSubjectProfileIdFromNotes,
  parseCheckoutReturnUrl,
} from "@/lib/listing-checkout";

{
  const notes = encodePurchaseNotes({
    subjectProfileId: "clxxxxxxxxxxxxxxxxxxxxxx",
    returnUrl: "/listings/abc#message-tutor",
    trigger: "contact_limit",
  });
  assert.ok(notes);
  const parsed = parsePurchaseNotes(notes);
  assert.equal(parsed.subjectProfileId, "clxxxxxxxxxxxxxxxxxxxxxx");
  assert.equal(parsed.returnUrl, "/listings/abc#message-tutor");
  assert.equal(parsed.trigger, "contact_limit");
}

{
  assert.equal(encodePurchaseNotes({ returnUrl: "https://evil.com" }), null);
  assert.equal(parsePurchaseNotes('{"returnUrl":"//evil.com"}').returnUrl, undefined);
}

{
  const cta = purchaseContinueCta({
    plan: "STUDENT_PASS",
    returnUrl: "/listings/xyz#message-tutor",
  });
  assert.equal(cta.href, "/listings/xyz#message-tutor");
  assert.match(cta.label, /Continue to tutor/i);
}

{
  const boost = purchaseContinueCta({
    plan: "AD_BOOST",
    subjectProfileId: "listing1",
  });
  assert.match(boost.href, /listing=listing1/);
  assert.match(boost.label, /Teaching Profile/i);
}

{
  const notes = encodeCheckoutNotes({
    subjectProfileId: "prof1",
    returnUrl: "/dashboard/tutor?tab=profile#teaching-listings",
    trigger: "listing_boost",
  });
  assert.equal(parseSubjectProfileIdFromNotes(notes), "prof1");
  assert.equal(
    parseCheckoutReturnUrl(notes),
    "/dashboard/tutor?tab=profile#teaching-listings",
  );
}

assert.ok(NON_STACKABLE_CHECKOUT_PLANS.includes("STUDENT_PASS"));
assert.ok(NON_STACKABLE_CHECKOUT_PLANS.includes("VERIFIED_TUTOR"));
assert.ok(!NON_STACKABLE_CHECKOUT_PLANS.includes("AD_BOOST"));

const root = join(process.cwd(), "src");
const subscribe = readFileSync(join(root, "components/SubscribeButton.tsx"), "utf8");
assert.match(subscribe, /returnUrl/);
assert.match(subscribe, /Secure checkout with Safepay/);
assert.match(subscribe, /purchase_intent/);

const complete = readFileSync(join(root, "app/api/safepay/complete/route.ts"), "utf8");
assert.match(complete, /continue/);
assert.match(complete, /parsePurchaseNotes/);

const adsNew = readFileSync(join(root, "app/ads/new/page.tsx"), "utf8");
assert.match(adsNew, /ContextualUpgradePanel/);
assert.match(adsNew, /returnUrl=\{returnPath\}/);

const assistant = readFileSync(join(root, "app/assistant/page.tsx"), "utf8");
assert.match(assistant, /Get Student Pro/);
assert.match(assistant, /returnUrl="\/assistant"/);

console.log("purchase-context.test.ts: ok");
