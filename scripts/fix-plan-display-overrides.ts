/**
 * Align SiteSettings plan display overrides with Tutor Pro / Priority Review copy.
 * Does NOT change prices or entitlements — names/descriptions/promo notes only.
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const row = await p.siteSettings.findFirst({ where: { id: "default" } });
  if (!row) throw new Error("SiteSettings default missing");
  const planPrices = { ...(row.planPrices || {}) };

  const before = JSON.parse(JSON.stringify(planPrices.TUTOR_BASIC || {}));
  const beforeVerified = JSON.parse(JSON.stringify(planPrices.VERIFIED_TUTOR || {}));
  const beforeBoost = JSON.parse(JSON.stringify(planPrices.AD_BOOST || {}));

  if (planPrices.TUTOR_BASIC) {
    planPrices.TUTOR_BASIC = {
      ...planPrices.TUTOR_BASIC,
      name: "Tutor Pro",
      description:
        "Relevance-first ranking, unlimited enquiry reveals, and up to 10 active teaching listings. Free tutors keep up to 3 listings with organic search visibility.",
      promoNote:
        "Tutor Pro is complimentary until 30 September 2026. Identity Verified is earned via review (not purchased). Listing Boost remains an optional paid add-on.",
    };
  }

  if (planPrices.VERIFIED_TUTOR) {
    planPrices.VERIFIED_TUTOR = {
      ...planPrices.VERIFIED_TUTOR,
      name: "Priority Verification Review",
      description:
        "Jump the identity-verification queue. The Identity Verified badge is earned only after admin approval — not purchased.",
      // keep pricePkr unchanged
    };
  }

  if (planPrices.AD_BOOST) {
    planPrices.AD_BOOST = {
      ...planPrices.AD_BOOST,
      name: "Listing Boost",
      description: "30-day boost window on one teaching listing among relevant matches.",
    };
  }

  // Do not sell legacy packs publicly via override names that look current — leave prices,
  // but mark descriptions clearly if present.
  if (planPrices.UNLIMITED_ADS) {
    planPrices.UNLIMITED_ADS = {
      ...planPrices.UNLIMITED_ADS,
      description:
        "Legacy unlimited listings pack — not sold as a primary product; existing holders keep entitlements.",
    };
  }

  await p.siteSettings.update({
    where: { id: "default" },
    data: { planPrices },
  });

  console.log(
    JSON.stringify(
      {
        before: { TUTOR_BASIC: before, VERIFIED_TUTOR: beforeVerified, AD_BOOST: beforeBoost },
        after: {
          TUTOR_BASIC: planPrices.TUTOR_BASIC,
          VERIFIED_TUTOR: planPrices.VERIFIED_TUTOR,
          AD_BOOST: planPrices.AD_BOOST,
        },
        pricesUnchanged: {
          tutor: before.pricePkr === planPrices.TUTOR_BASIC.pricePkr,
          verified: beforeVerified.pricePkr === planPrices.VERIFIED_TUTOR.pricePkr,
          boost: beforeBoost.pricePkr === planPrices.AD_BOOST.pricePkr,
        },
      },
      null,
      2,
    ),
  );
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
