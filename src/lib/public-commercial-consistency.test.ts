/**
 * Public commercial truth — detect copy drift against Marketplace V2 SoT.
 * Does not rewrite legal prose; asserts product numbers and forbids retired cliffs.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUSINESS } from "@/lib/business-rules";
import { formatPlanPrice } from "@/lib/currency";
import {
  IDENTITY_VERIFIED_LINE,
  TUTOR_FREE_LISTING_LINE,
  TUTOR_PRO_LISTING_LINE,
  studentFreeContactsPhrase,
} from "@/lib/marketing-copy";
import { addOnBillingFootnote, planBillingFootnote } from "@/lib/payments-status";
import {
  DEFAULT_PLANS,
  PUBLIC_ADDON_PLAN_IDS,
  applyPlanOverrides,
  resolvePlan,
} from "@/lib/plans";
import {
  FREE_SUBJECT_PROFILES,
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
  TUTOR_PRO_SUBJECT_PROFILE_CAP,
  isSubjectProfilePromoActive,
} from "@/lib/subject-profile-entitlements";
import { TUTOR_COMPARE_ROWS, FREE_VS_PAID_FAQS } from "@/lib/free-vs-paid";

const root = join(process.cwd(), "src");

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

// 1–2. Free = 1, Pro = 10
assert.equal(BUSINESS.tutorFreeActiveListings, 1);
assert.equal(BUSINESS.tutorProActiveListings, 10);
assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(TUTOR_PRO_SUBJECT_PROFILE_CAP, 10);
assert.match(TUTOR_FREE_LISTING_LINE, /1 active Teaching Profile/);
assert.match(TUTOR_PRO_LISTING_LINE, /up to 10 active Teaching Profiles/);

// 3–4. No retired listing-cap cliffs in public app sources
const publicSurfaces = [
  "app/(home)/page.tsx",
  "app/pricing/page.tsx",
  "app/free-vs-paid/page.tsx",
  "app/about/page.tsx",
  "app/help/page.tsx",
  "app/how-it-works/page.tsx",
  "app/become-a-tutor/page.tsx",
  "app/terms/page.tsx",
  "app/privacy/page.tsx",
  "app/refund/page.tsx",
  "lib/marketing-copy.ts",
  "lib/free-vs-paid.ts",
  "lib/plans.ts",
  "components/PricingPlansClient.tsx",
];

const cliffPatterns = [
  /2\s+free\s+(teaching\s+)?listings?/i,
  /two\s+free\s+(teaching\s+)?listings?/i,
  /until\s+30\s+September.*(?:0|zero)\s+(?:active\s+)?(?:listings?|profiles?)/i,
  /from\s+1\s+October/i,
  /October\s+1.*(?:paid|zero|0)/i,
  /all\s+teaching\s+listings?\s+are\s+paid/i,
  /3\s*(?:→|->|to)\s*1/,
  /Tutor\s+Basic/i,
];

for (const rel of publicSurfaces) {
  const text = readSrc(rel);
  for (const re of cliffPatterns) {
    assert.doesNotMatch(
      text,
      re,
      `Stale commercial cliff in ${rel}: ${re}`,
    );
  }
}

// Listing-cap promo retired; Free stays 1 after promo constant too
assert.equal(isSubjectProfilePromoActive(), false);
assert.equal(FREE_SUBJECT_PROFILES_AFTER_PROMO, 1);

// 5. No current public +1 Teaching Profile SKU
assert.deepEqual(PUBLIC_ADDON_PLAN_IDS, ["VERIFIED_TUTOR", "AD_BOOST"]);
const publicAddOns = DEFAULT_PLANS.filter((p) => PUBLIC_ADDON_PLAN_IDS.includes(p.id));
assert.ok(!publicAddOns.some((p) => /extra profile|\+1|one more profile/i.test(p.name + p.description)));

// 6. Listing Boost does not grant capacity
const boost = DEFAULT_PLANS.find((p) => p.id === "AD_BOOST")!;
assert.equal(boost.pricePkr, 999);
assert.equal(boost.annualPricePkr, Math.round(999 * 9.6));
assert.equal(boost.isAddOn, true);
assert.ok(boost.features.some((f) => /does not increase Teaching Profile capacity/i.test(f)));
assert.ok(boost.features.some((f) => /annual/i.test(f)));
assert.ok(boost.features.some((f) => /20%/i.test(f)));
assert.ok(/20%|annual/i.test(boost.description));

const boostResolved = resolvePlan(boost);
assert.equal(boostResolved.annualChargePricePkr, Math.round(999 * 9.6));

const boostRow = TUTOR_COMPARE_ROWS.find((r) => r.feature === "Listing Boost")!;
assert.match(boostRow.detail, /does not increase Teaching Profile capacity/i);

// 7. Student Free contacts = 3 unique tutors/month
assert.equal(BUSINESS.studentFreeContactsPerMonth, 3);
assert.match(studentFreeContactsPhrase(), /^3 new tutor contacts per month$/);

// 8. Priority Verification Review does not auto-verify
const priority = DEFAULT_PLANS.find((p) => p.id === "VERIFIED_TUTOR")!;
assert.equal(priority.pricePkr, 2999);
assert.ok(priority.features.some((f) => /never auto-awards verification/i.test(f)));
assert.match(IDENTITY_VERIFIED_LINE, /earned, not purchased/i);
assert.match(IDENTITY_VERIFIED_LINE, /not a qualification/i);

const help = readSrc("app/help/page.tsx");
assert.match(help, /Identity Verified/);
assert.match(help, /never auto-awards/);
assert.doesNotMatch(help, /buy the badge.*automatically verified/i);

// 9. Internal legacy IDs remain; not primary public products
assert.ok(DEFAULT_PLANS.some((p) => p.id === "EXTRA_PROFILE_ADS" && /legacy/i.test(p.name)));
assert.ok(DEFAULT_PLANS.some((p) => p.id === "UNLIMITED_ADS" && /legacy/i.test(p.name)));
assert.ok(DEFAULT_PLANS.some((p) => p.id === "TUTOR_BASIC" && p.name === "Tutor Pro"));
assert.ok(!PUBLIC_ADDON_PLAN_IDS.includes("EXTRA_PROFILE_ADS"));
assert.ok(!PUBLIC_ADDON_PLAN_IDS.includes("UNLIMITED_ADS"));

const pricingClient = readSrc("components/PricingPlansClient.tsx");
assert.doesNotMatch(pricingClient, /Extra Profile Ads(?! \(legacy\))/);
assert.match(pricingClient, /legacy Extra\/Unlimited/);

// 10. Tutor Pro promo date does not alter Free Teaching Profile cap
const tutorPro = resolvePlan(DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!);
assert.equal(tutorPro.promoUntil, "2026-09-30");
assert.ok(tutorPro.isComplimentary || tutorPro.promoEnabled);
assert.equal(FREE_SUBJECT_PROFILES, 1);
assert.equal(isSubjectProfilePromoActive(), false);

// One-time add-on price formatting (no /mo)
const oncePrice = formatPlanPrice(999, "PKR", "once");
assert.ok(oncePrice.includes("999"));
assert.doesNotMatch(oncePrice, /\/mo|\/yr/);
assert.match(formatPlanPrice(999, "PKR", "month"), /\/mo$/);
assert.match(formatPlanPrice(1499, "PKR", "year"), /\/yr$/);

assert.match(addOnBillingFootnote("PKR", true, "boost"), /One-time|30-day boost/i);
assert.doesNotMatch(addOnBillingFootnote("PKR", true, "boost"), /Billed monthly/i);
assert.match(addOnBillingFootnote("PKR", true, "verification"), /One-time/i);
assert.match(planBillingFootnote("PKR", true, "monthly"), /Billed monthly/);
assert.match(planBillingFootnote("PKR", true, "once"), /One-time purchase/);

// PlanPrice path for add-ons must use once formatting helpers (30-day or annual boost)
assert.match(pricingClient, /formatPlanPrice\([\s\S]*?"once"/);
assert.match(pricingClient, /addOnBillingFootnote/);
assert.match(pricingClient, /oneTime=\{Boolean\(plan\.isAddOn\)\}/);
assert.match(pricingClient, /ANNUAL_SAVE_LABEL/);
assert.match(addOnBillingFootnote("PKR", true, "boost", "annual"), /365-day|20%/i);

// Stale branding overrides stay mapped to public names
const overridden = applyPlanOverrides({
  TUTOR_BASIC: { name: "Tutor Basic" },
  VERIFIED_TUTOR: { name: "Verified Tutor" },
  AD_BOOST: { name: "Profile Boost" },
});
assert.equal(overridden.find((p) => p.id === "TUTOR_BASIC")!.name, "Tutor Pro");
assert.equal(overridden.find((p) => p.id === "VERIFIED_TUTOR")!.name, "Priority Verification Review");
assert.equal(overridden.find((p) => p.id === "AD_BOOST")!.name, "Listing Boost");

// Terms: no false auto-renew assumption
const terms = readSrc("app/terms/page.tsx");
assert.match(terms, /Automatic renewal is not assumed/i);
assert.doesNotMatch(terms, /Subscriptions renew\s+according to the plan you purchase unless cancelled/i);

// Free-vs-paid FAQ keeps Free permanent + Pro promo separate
const proFaq = FREE_VS_PAID_FAQS.find((f) => f.q === "Is Tutor Pro really free right now?");
assert.ok(proFaq);
assert.match(proFaq!.a, new RegExp(`${FREE_SUBJECT_PROFILES} active Teaching Profile`));
assert.match(proFaq!.a, /30 September 2026/);

console.log("public-commercial-consistency.test.ts: ok");
