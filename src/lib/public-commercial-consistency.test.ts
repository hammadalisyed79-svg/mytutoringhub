/**
 * Public commercial truth — detect copy drift against locked Marketplace model.
 * Does not rewrite legal prose; asserts product numbers and forbids retired cliffs.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUSINESS } from "@/lib/business-rules";
import { formatPlanPrice } from "@/lib/currency";
import {
  EXAM_PREP_CTA,
  IDENTITY_VERIFIED_LINE,
  STUDENT_REQUESTS_LINE,
  TUTOR_FREE_LISTING_LINE,
  TUTOR_PRO_LISTING_LINE,
  TUTOR_PRO_LAUNCH_OFFER_LINE,
  TUTOR_PRO_LAUNCH_OFFER_UNTIL,
  studentFreeContactsPhrase,
} from "@/lib/marketing-copy";
import { addOnBillingFootnote, planBillingFootnote } from "@/lib/payments-status";
import {
  ANNUAL_SAVE_LABEL,
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
import { buildAiSupportSystemPrompt, buildAiStudySystemPrompt } from "@/lib/ai-support";
import { DEFAULT_PAST_PAPER_FEE_PKR } from "@/lib/past-papers";

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
assert.doesNotMatch(TUTOR_FREE_LISTING_LINE, /Extra Active/);
assert.match(TUTOR_PRO_LISTING_LINE, /up to 10 active Teaching Profiles/);
assert.doesNotMatch(TUTOR_PRO_LISTING_LINE, /analytics|enhanced student-request/i);
assert.match(EXAM_PREP_CTA, /Student Pass unlocks unlimited tutor messages/);
assert.match(EXAM_PREP_CTA, /10 past paper downloads per month/);
assert.doesNotMatch(EXAM_PREP_CTA, /unlimited tutor messages and past papers with Student Pass/i);
assert.doesNotMatch(STUDENT_REQUESTS_LINE, /faster responses/i);

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
  "lib/help-knowledge.ts",
  "lib/ai-support.ts",
  "components/PricingPlansClient.tsx",
  "components/LaunchOfferBlock.tsx",
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
    assert.doesNotMatch(text, re, `Stale commercial cliff in ${rel}: ${re}`);
  }
}

assert.equal(isSubjectProfilePromoActive(), false);
assert.equal(FREE_SUBJECT_PROFILES_AFTER_PROMO, 1);

// 5. Extra Active is legacy — not sold on public Pricing
assert.deepEqual(PUBLIC_ADDON_PLAN_IDS, ["VERIFIED_TUTOR", "AD_BOOST"]);
assert.ok(!PUBLIC_ADDON_PLAN_IDS.includes("EXTRA_ACTIVE"));
const extraActive = DEFAULT_PLANS.find((p) => p.id === "EXTRA_ACTIVE")!;
assert.ok(/legacy/i.test(extraActive.name));
assert.equal(extraActive.pricePkr, 499);
assert.ok(!PUBLIC_ADDON_PLAN_IDS.includes("EXTRA_PROFILE_ADS"));

const pricingClient = readSrc("components/PricingPlansClient.tsx");
assert.doesNotMatch(pricingClient, /Extra Active/);
assert.doesNotMatch(pricingClient, /EXTRA_ACTIVE/);

const marketing = readSrc("lib/marketing-copy.ts");
assert.doesNotMatch(marketing, /Extra Active/);
assert.match(marketing, /Listing Boost and Priority Verification Review are separate paid add-ons/);

const freeVsPaid = readSrc("lib/free-vs-paid.ts");
assert.doesNotMatch(freeVsPaid, /Extra Active/);
assert.match(freeVsPaid, /Tutor Pro — up to/);
assert.doesNotMatch(freeVsPaid, /Launch offer ended/);
assert.doesNotMatch(freeVsPaid, /Is Tutor Pro really free/);

const pricingPage = readSrc("app/pricing/page.tsx");
assert.doesNotMatch(pricingPage, /Extra Active/);
assert.match(pricingPage, /active Teaching Profile/);

// 6. Listing Boost does not grant capacity
const boost = DEFAULT_PLANS.find((p) => p.id === "AD_BOOST")!;
assert.equal(boost.pricePkr, 999);
assert.equal(boost.annualPricePkr, Math.round(999 * 9.6));
assert.equal(boost.isAddOn, true);
assert.ok(boost.features.some((f) => /does not increase Teaching Profile capacity/i.test(f)));

const boostRow = TUTOR_COMPARE_ROWS.find((r) => r.feature === "Listing Boost")!;
assert.match(boostRow.detail, /does not increase Teaching Profile capacity/i);

// 7. Student Free contacts = 3
assert.equal(BUSINESS.studentFreeContactsPerMonth, 3);
assert.match(studentFreeContactsPhrase(), /^3 new tutor contacts per month$/);

// 8. Priority Verification Review = PKR 2999
const priority = DEFAULT_PLANS.find((p) => p.id === "VERIFIED_TUTOR")!;
assert.equal(priority.pricePkr, 2999);
assert.ok(priority.features.some((f) => /never auto-(awards verification|verifies)/i.test(f)));
assert.match(IDENTITY_VERIFIED_LINE, /earned, not purchased/i);

const help = readSrc("lib/help-knowledge.ts");
assert.match(help, /Identity Verified/);
assert.match(help, /Access remains active[\s\S]*for the purchased period/i);
assert.doesNotMatch(help, /What are Hub Points/);
assert.doesNotMatch(help, /Extra Active/);

// 9. Legacy IDs remain for grandfathering
assert.ok(DEFAULT_PLANS.some((p) => p.id === "EXTRA_ACTIVE" && /legacy/i.test(p.name)));
assert.ok(DEFAULT_PLANS.some((p) => p.id === "TUTOR_BASIC" && p.name === "Tutor Pro"));

const launchOffer = readSrc("components/LaunchOfferBlock.tsx");
assert.match(launchOffer, /Activate Tutor Pro free/);
assert.doesNotMatch(launchOffer, /Use Extra Active/);
assert.doesNotMatch(launchOffer, /Need one more live subject/);

// 10. Tutor Pro promo
const tutorPro = resolvePlan(DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!);
assert.equal(tutorPro.promoUntil, "2026-09-30");
assert.equal(tutorPro.promoEnabled, false);
assert.equal(tutorPro.isPromoActive, false);
assert.match(tutorPro.promoNote || "", /Listing Boost and Priority Verification Review/);
assert.doesNotMatch(tutorPro.promoNote || "", /Extra Active/);

const afterPromo = resolvePlan(
  DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!,
  new Date("2026-10-01T00:00:01+05:00"),
);
assert.equal(afterPromo.isPromoActive, false);

// Even if admin left promoEnabled on past the Launch offer hard end, complimentary must stay off.
const staleAdminPromo = resolvePlan(
  {
    ...DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!,
    promoEnabled: true,
    promoPricePkr: 0,
    promoUntil: "2026-09-30",
  },
  new Date("2026-10-01T01:00:00+05:00"),
);
assert.equal(staleAdminPromo.isPromoActive, false);

const stillLive = resolvePlan(
  {
    ...DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!,
    promoEnabled: true,
    promoPricePkr: 0,
    promoUntil: "2026-09-30",
  },
  new Date("2026-09-30T18:00:00Z"), // still 30 Sep evening in Karachi
);
assert.equal(stillLive.isPromoActive, true);

const afterKarachiMidnight = resolvePlan(
  {
    ...DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!,
    promoEnabled: true,
    promoPricePkr: 0,
    promoUntil: "2026-09-30",
  },
  new Date("2026-09-30T19:00:00Z"), // 00:00 1 Oct Asia/Karachi
);
assert.equal(afterKarachiMidnight.isPromoActive, false);

// Admin cannot re-open complimentary Tutor Pro with a later promoUntil after hard end.
const reopenedZeroPromo = resolvePlan(
  {
    ...DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!,
    promoEnabled: true,
    promoPricePkr: 0,
    promoUntil: "2026-12-31",
  },
  new Date("2026-10-01T12:00:00+05:00"),
);
assert.equal(reopenedZeroPromo.isPromoActive, false);
assert.equal(reopenedZeroPromo.isComplimentary, false);
assert.equal(reopenedZeroPromo.chargePricePkr, 1499);

// Paid (non-zero) promos after hard end are still allowed by resolvePlan.
const paidPromoAfter = resolvePlan(
  {
    ...DEFAULT_PLANS.find((p) => p.id === "TUTOR_BASIC")!,
    promoEnabled: true,
    promoPricePkr: 999,
    promoUntil: "2026-12-31",
  },
  new Date("2026-10-01T12:00:00+05:00"),
);
assert.equal(paidPromoAfter.isPromoActive, true);
assert.equal(paidPromoAfter.chargePricePkr, 999);

assert.match(formatPlanPrice(999, "PKR", "once"), /999/);
assert.match(addOnBillingFootnote("PKR", true, "verification"), /One-time/i);
assert.match(ANNUAL_SAVE_LABEL, /Save 20% with annual billing/);

const overridden = applyPlanOverrides({
  TUTOR_BASIC: {
    name: "Tutor Basic",
    description:
      "Relevance-first ranking, unlimited student contacts, and up to 10 active Teaching Profiles. Free tutors keep up to 3 Teaching Profiles with organic search visibility.",
  },
  VERIFIED_TUTOR: { name: "Verified Tutor" },
  AD_BOOST: { name: "Profile Boost" },
});
assert.equal(overridden.find((p) => p.id === "TUTOR_BASIC")!.name, "Tutor Pro");
assert.equal(overridden.find((p) => p.id === "VERIFIED_TUTOR")!.name, "Priority Verification Review");
assert.equal(overridden.find((p) => p.id === "AD_BOOST")!.name, "Listing Boost");
assert.doesNotMatch(
  overridden.find((p) => p.id === "TUTOR_BASIC")!.description,
  /up to 3 Teaching Profiles|Extra Active/i,
);
assert.match(
  overridden.find((p) => p.id === "TUTOR_BASIC")!.description,
  /up to 10 live Teaching Profiles/i,
);
assert.equal(overridden.find((p) => p.id === "VERIFIED_TUTOR")!.pricePkr, 2999);

const terms = readSrc("app/terms/page.tsx");
assert.match(terms, /Access remains active[\s\S]*for the purchased period/i);
assert.match(terms, /never collected by My Tutoring Hub|never processed through Safepay/i);
assert.doesNotMatch(terms, /Subscriptions renew\s+according to the plan you purchase unless cancelled/i);

const refund = readSrc("app/refund/page.tsx");
assert.match(refund, /Access remains active[\s\S]*for the purchased period/i);

const privacy = readSrc("app/privacy/page.tsx");
assert.doesNotMatch(privacy, /Legal review backlog/i);
assert.doesNotMatch(privacy, /no advertising cookies/i);

const proFaq = FREE_VS_PAID_FAQS.find((f) => f.q === "What does Tutor Pro include?");
assert.ok(proFaq);
assert.match(proFaq!.a, new RegExp(`${FREE_SUBJECT_PROFILES} active Teaching Profile`));
assert.doesNotMatch(proFaq!.a, /really free right now/i);
assert.doesNotMatch(proFaq!.a, /Extra Active/);

const aiSupport = readSrc("lib/ai-support.ts");
assert.match(aiSupport, /TUTOR_PRO_PUBLIC_LINE/);
assert.match(aiSupport, /buildAiSupportSystemPrompt/);
assert.match(aiSupport, /paidCheckoutLive/);
assert.match(aiSupport, /Teaching Profile/);
assert.match(aiSupport, /Listing Boost/);
assert.match(aiSupport, /Priority Verification Review/);
assert.match(aiSupport, /Access until/);
assert.match(aiSupport, /Science and Computer Science/);
assert.doesNotMatch(aiSupport, /Extra Active/);
assert.doesNotMatch(aiSupport, /Tutor Basic/i);

const supportLive = buildAiSupportSystemPrompt({ paidCheckoutLive: true, currency: "EUR" });
const supportSoon = buildAiSupportSystemPrompt({ paidCheckoutLive: false, currency: "USD" });
assert.match(supportLive, /Safepay checkout is LIVE/);
assert.match(supportSoon, /not configured right now/);
assert.match(supportLive, /Always quote money in EUR/);
assert.match(supportLive, new RegExp(`${BUSINESS.studentFreeContactsPerMonth} new tutor contacts`));
assert.match(supportLive, new RegExp(`${BUSINESS.studentPassPaperDownloadsPerMonth} past paper`));
assert.match(supportLive, new RegExp(`up to ${BUSINESS.tutorProActiveListings} active Teaching Profiles`));
assert.doesNotMatch(supportLive, /list PKR 1999|list PKR 3499|one-time PKR 2999/i);
assert.doesNotMatch(
  supportLive,
  /unlimited past papers with Student Pass|faster responses with Student Pass/i,
);
assert.match(supportLive, /professional support specialist|How to talk \(sound human\)/i);
assert.match(supportLive, /Website FAQ knowledge/);
assert.match(supportLive, /Policies \(summaries/);
assert.match(supportLive, /\/countries\//);
assert.match(supportLive, /badge is earned, not purchased|Never say users can buy the Identity Verified badge/i);
assert.doesNotMatch(supportLive, /help bot/i);
assert.match(supportLive, /Avoid filler, emoji, slang, and chatbot phrases/i);

// Stabilization gap fixes: Tutor Requests + exam resources labeling
const freeVsPaidUi = readSrc("components/FreeVsPaidComparison.tsx");
assert.match(freeVsPaidUi, /Tutor\s+Requests/);
assert.doesNotMatch(freeVsPaidUi, /request ads/i);
const homePapers = readSrc("components/HomePastPapersShowcase.tsx");
assert.match(homePapers, /exam resources/);
assert.doesNotMatch(homePapers, /\d+ past papers\. And tutors/i);

const helpFaq = readSrc("lib/help-knowledge.ts");
assert.match(helpFaq, /reply to inbound student messages before verifying/i);
assert.doesNotMatch(helpFaq, /messaging and student requests stay locked until you confirm/i);
assert.match(helpFaq, /through Safepay\./);
assert.doesNotMatch(helpFaq, /when checkout is available/);

// Dead contact-bonus referral path removed; Hub Points attribution remains the live path.
assert.doesNotMatch(readSrc("lib/plan-limits.ts"), /applyReferralSignup/);
assert.doesNotMatch(readSrc("lib/plan-limits.ts"), /REFERRAL_CONTACT_BONUS/);
assert.ok(!existsSync(join(process.cwd(), "src/components/ReferralShareButton.tsx")));
assert.ok(!existsSync(join(process.cwd(), "src/components/GoogleAnalytics.tsx")));
assert.match(readSrc("components/GoogleTagHead.tsx"), /GoogleTagHead/);
assert.match(readSrc("app/api/register/route.ts"), /attributeReferralOnSignup/);

const sunsetEmail = readSrc("lib/email.ts");
assert.match(sunsetEmail, /offerIsComplimentary/);
assert.match(sunsetEmail, /Tutor Pro after the Launch offer/);
// Free-activate CTA only inside the complimentary branch, not the post-offer default.
assert.match(sunsetEmail, /if \(opts\.offerIsComplimentary\)/);

const studyPrompt = buildAiStudySystemPrompt();
assert.match(studyPrompt, /Student Pro/);
assert.match(studyPrompt, /\/search/);
assert.match(studyPrompt, /\/support/);

assert.match(TUTOR_PRO_LAUNCH_OFFER_UNTIL, /30 September 2026/);
assert.match(TUTOR_PRO_LAUNCH_OFFER_LINE, /Listing Boost and Priority Verification Review are separate paid add-ons/);
assert.doesNotMatch(TUTOR_PRO_LAUNCH_OFFER_LINE, /was complimentary until/);

// Safepay hosts platform SKUs only — no lesson fee product
const safepayCheckout = readSrc("app/api/safepay/checkout/route.ts");
assert.match(safepayCheckout, /STUDENT_PASS/);
assert.match(safepayCheckout, /TUTOR_BASIC/);
assert.match(safepayCheckout, /VERIFIED_TUTOR/);
assert.match(safepayCheckout, /AD_BOOST/);
assert.doesNotMatch(safepayCheckout, /LESSON|lesson_fee|TUTOR_PAYOUT/i);
assert.match(terms, /never processed through Safepay|never collected by My Tutoring Hub/i);
assert.match(help, /never processed through Safepay/i);
assert.doesNotMatch(help, /plans automatically renew|auto-renews? unless cancelled/i);
assert.doesNotMatch(terms, /plans automatically renew/i);
assert.doesNotMatch(refund, /plans automatically renew/i);

const subscribeBtn = readSrc("components/SubscribeButton.tsx");
assert.match(subscribeBtn, /no auto-renew unless stated at checkout/i);

assert.equal(DEFAULT_PAST_PAPER_FEE_PKR, 100);

console.log("public-commercial-consistency.test.ts: ok");
