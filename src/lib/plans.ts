import type { SubscriptionPlan } from "@/lib/types";
import { BUSINESS } from "@/lib/business-rules";

export type PlanDefinition = {
  id: SubscriptionPlan;
  name: string;
  description: string;
  audience: "student" | "tutor";
  /** Monthly list price stored in PKR base units (converted at display/checkout). */
  pricePkr: number;
  /**
 * Annual list price in PKR (~9.6× monthly ≈ 20% off twelve charges).
 * Add-ons are one-time and omit this unless they offer a 365-day variant.
 */
  annualPricePkr?: number;
  features: string[];
  envPriceId: string;
  isAddOn?: boolean;
  promoEnabled?: boolean;
  promoPricePkr?: number;
  /** Inclusive end date, YYYY-MM-DD. */
  promoUntil?: string;
  promoLabel?: string;
  promoNote?: string;
};

export type PlanPriceOverride = {
  pricePkr?: number;
  name?: string;
  description?: string;
  promoEnabled?: boolean;
  promoPricePkr?: number;
  promoUntil?: string;
  promoLabel?: string;
  promoNote?: string;
};

export type ResolvedPlan = PlanDefinition & {
  listPricePkr: number;
  chargePricePkr: number;
  /** Annual charge in PKR when billing annually exists; null for one-time add-ons. */
  annualChargePricePkr: number | null;
  isPromoActive: boolean;
  isComplimentary: boolean;
  promoEndsAt: Date | null;
  savingsPercent: number;
};

/** ~20% off vs paying twelve separate monthly/30-day charges (×9.6). */
export function defaultAnnualPricePkr(monthlyPkr: number) {
  return Math.round(monthlyPkr * 9.6);
}

/** Preferred public annual wording. */
export const ANNUAL_SAVE_LABEL = "Save 20% with annual billing";
export const ANNUAL_SAVE_FOOTNOTE =
  "Annual billing saves about 20% versus twelve separate monthly or 30-day charges.";

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    id: "STUDENT_PASS",
    name: "Student Pass",
    description: `Unlimited tutor contacts and student request ads. Free accounts get ${BUSINESS.studentFreeContactsPerMonth} contacts/month.`,
    audience: "student",
    pricePkr: 1999,
    annualPricePkr: defaultAnnualPricePkr(1999),
    features: [
      "Unlimited new tutor contacts",
      "10 past paper downloads per month",
      "Post “need a tutor” ads",
      "Browse tutors worldwide",
      "Online or in-person lessons",
    ],
    envPriceId: "STRIPE_PRICE_STUDENT_PASS",
  },
  {
    id: "STUDENT_PRO",
    name: "Student Pro",
    description: "Everything in Student Pass, plus the AI study assistant.",
    audience: "student",
    pricePkr: 3499,
    annualPricePkr: defaultAnnualPricePkr(3499),
    features: [
      "Everything in Student Pass",
      "Unlimited past paper downloads",
      "AI study assistant",
      "Unlimited tutor contacts",
      "Post “need a tutor” ads",
    ],
    envPriceId: "STRIPE_PRICE_STUDENT_PRO",
  },
  {
    id: "TUTOR_BASIC",
    name: "Tutor Pro",
    description:
      "Best for tutors teaching several subjects: up to 10 live Teaching Profiles, stronger ranking among relevant matches, and unlimited enquiry reveals.",
    audience: "tutor",
    pricePkr: 1499,
    annualPricePkr: defaultAnnualPricePkr(1499),
    features: [
      "Up to 10 active Teaching Profiles",
      "Stronger placement among relevant matches (never overrides subject fit)",
      "Unlimited enquiry reveals when you message students first",
      "Enhanced student-request access and analytics",
      "Keep 100% of lesson fees — no commission",
    ],
    envPriceId: "STRIPE_PRICE_TUTOR_BASIC",
    promoEnabled: true,
    promoPricePkr: 0,
    promoUntil: "2026-09-30",
    promoLabel: "Launch offer",
    promoNote:
      "Launch offer: Tutor Pro is free until 30 September 2026 (up to 10 live profiles, ranking, unlimited reveals). After that, list price applies. Free listing stays 1 live Teaching Profile permanently. Listing Boost and Priority Verification Review are separate paid add-ons.",
  },
  {
    id: "VERIFIED_TUTOR",
    name: "Priority Verification Review",
    description:
      "Skip ahead in the identity-review queue. The Identity Verified badge is earned only if review is approved — you cannot buy the badge.",
    audience: "tutor",
    pricePkr: 2999,
    features: [
      "One-time purchase (not a subscription)",
      "Priority place in the identity-verification queue",
      "Badge only after successful review — payment never auto-verifies you",
      "Badge stays on your profile after review approval",
    ],
    envPriceId: "STRIPE_PRICE_VERIFIED_TUTOR",
    isAddOn: true,
  },
  {
    id: "HIGHLIGHTED_AD",
    name: "Listing Highlight (legacy)",
    description:
      "Legacy 30-day highlight on one Teaching Profile. Prefer Listing Boost for new purchases. Existing holders keep entitlement.",
    audience: "tutor",
    pricePkr: 1299,
    features: ["Highlighted badge on that listing", "Stronger placement among relevant matches for 30 days"],
    envPriceId: "STRIPE_PRICE_HIGHLIGHTED_AD",
    isAddOn: true,
  },
  {
    id: "AD_BOOST",
    name: "Listing Boost",
    description:
      "Give one Teaching Profile a temporary visibility lift among relevant matches. Does not add more live profiles.",
    audience: "tutor",
    pricePkr: 999,
    /** ~9.6× 30-day price ≈ 20% off buying twelve separate boosts. */
    annualPricePkr: defaultAnnualPricePkr(999),
    features: [
      "30-day boost · one-time (not a subscription)",
      "365-day option · about 20% off vs twelve 30-day buys",
      "Stronger placement among relevant matches for the window",
      "Does not increase Teaching Profile capacity",
      "Buy from the Teaching Profile you want to boost",
    ],
    envPriceId: "STRIPE_PRICE_AD_BOOST",
    isAddOn: true,
  },
  {
    id: "EXTRA_ACTIVE",
    name: "Extra Active Profile (legacy)",
    description:
      "Legacy +1 live Teaching Profile add-on. No longer sold to new customers. Existing subscribers keep their entitlement until the period ends.",
    audience: "tutor",
    pricePkr: 499,
    annualPricePkr: Math.round(499 * 9.6),
    features: [
      "+1 live Teaching Profile while subscribed (grandfathered)",
      "Stack up to 2 extras (3 live total with Free) for existing holders",
      "Paused drafts stay free — only live slots count",
      "New tutors: upgrade to Tutor Pro for up to 10 live profiles",
    ],
    envPriceId: "STRIPE_PRICE_EXTRA_ACTIVE",
    isAddOn: true,
  },
  {
    id: "EXTRA_PROFILE_ADS",
    name: "Extra Profile Ads (legacy)",
    description:
      "Legacy listing pack — no longer sold as a primary product. Grandfathered holders keep Tutor Pro–equivalent Teaching Profile capacity (up to 10) and unlimited enquiry reveals.",
    audience: "tutor",
    pricePkr: 999,
    features: [
      "Up to 10 active Teaching Profiles (V2 Pro-equivalent)",
      "Unlimited enquiry reveals while active",
    ],
    envPriceId: "STRIPE_PRICE_EXTRA_PROFILE_ADS",
    isAddOn: true,
  },
  {
    id: "UNLIMITED_ADS",
    name: "Unlimited Profiles (legacy)",
    description:
      "Legacy pack — no longer sold as a primary product. Grandfathered holders keep unlimited active Teaching Profiles and unlimited enquiry reveals.",
    audience: "tutor",
    pricePkr: 1999,
    features: [
      "Unlimited active Teaching Profiles",
      "Unlimited enquiry reveals while active",
    ],
    envPriceId: "STRIPE_PRICE_UNLIMITED_ADS",
    isAddOn: true,
  },
];

/** Add-ons shown on public Pricing. Legacy capacity SKUs stay in DB/checkout for grandfathering. */
export const PUBLIC_ADDON_PLAN_IDS: SubscriptionPlan[] = [
  "VERIFIED_TUTOR",
  "AD_BOOST",
];

/** Monthly/annual add-ons (not one-time). Legacy Extra Active remains recurring for existing holders. */
export function isRecurringAddOnPlan(planId: string): boolean {
  return planId === "EXTRA_ACTIVE";
}

/** Code defaults. Live checkout/pricing uses `getLivePlans()` so admin can override amounts. */
export const PLANS = DEFAULT_PLANS;

export function endOfPromoDay(isoDate: string | null | undefined) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const ends = new Date(`${isoDate}T23:59:59.999Z`);
  return Number.isNaN(ends.getTime()) ? null : ends;
}

export function formatPromoUntil(isoDate: string | Date | null | undefined) {
  const date =
    isoDate instanceof Date
      ? isoDate
      : typeof isoDate === "string"
        ? endOfPromoDay(isoDate)
        : null;
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function applyPlanOverrides(
  overrides: Record<string, PlanPriceOverride> | null | undefined,
): PlanDefinition[] {
  return DEFAULT_PLANS.map((plan) => {
    const over = overrides?.[plan.id];
    const price = Number(over?.pricePkr);
    const promoPrice = Number(over?.promoPricePkr);
    let name = over?.name?.trim() || plan.name;
    // Stale SiteSettings overrides must not resurrect retired public branding.
    if (plan.id === "TUTOR_BASIC" && /^tutor\s*basic$/i.test(name)) {
      name = "Tutor Pro";
    }
    if (plan.id === "VERIFIED_TUTOR" && /^verified\s*tutor$/i.test(name)) {
      name = "Priority Verification Review";
    }
    if (plan.id === "AD_BOOST" && /^(ad\s*boost|profile\s*boost)$/i.test(name)) {
      name = "Listing Boost";
    }

    const overDesc = over?.description?.trim() || "";
    const overNote = over?.promoNote?.trim() || "";
    const retiredCopy =
      /Extra Active|Tutor Basic|Profile Boost|up to 3 Teaching Profiles|keep up to 3/i;
    // Public catalogue copy stays locked to DEFAULT_PLANS when overrides drift.
    const lockPublicCopy =
      plan.id === "TUTOR_BASIC" ||
      plan.id === "VERIFIED_TUTOR" ||
      plan.id === "AD_BOOST" ||
      plan.id === "STUDENT_PASS" ||
      plan.id === "STUDENT_PRO" ||
      retiredCopy.test(overDesc) ||
      retiredCopy.test(overNote);

    const lockedPrice =
      plan.id === "VERIFIED_TUTOR" ||
      plan.id === "AD_BOOST" ||
      plan.id === "TUTOR_BASIC" ||
      plan.id === "STUDENT_PASS" ||
      plan.id === "STUDENT_PRO";

    return {
      ...plan,
      pricePkr: lockedPrice
        ? plan.pricePkr
        : Number.isFinite(price) && price >= 0
          ? Math.round(price)
          : plan.pricePkr,
      name,
      description: lockPublicCopy ? plan.description : overDesc || plan.description,
      promoEnabled: over?.promoEnabled ?? plan.promoEnabled ?? false,
      promoPricePkr: Number.isFinite(promoPrice) && promoPrice >= 0 ? Math.round(promoPrice) : plan.promoPricePkr,
      promoUntil: over?.promoUntil || plan.promoUntil,
      promoLabel: over?.promoLabel?.trim() || plan.promoLabel,
      promoNote: lockPublicCopy ? plan.promoNote : overNote || plan.promoNote,
    };
  });
}

export function resolvePlan(plan: PlanDefinition, now = new Date()): ResolvedPlan {
  const endsAt = plan.promoEnabled ? endOfPromoDay(plan.promoUntil) : null;
  const isPromoActive = Boolean(
    plan.promoEnabled &&
      endsAt &&
      now.getTime() <= endsAt.getTime() &&
      plan.promoPricePkr != null &&
      plan.promoPricePkr >= 0 &&
      plan.promoPricePkr < plan.pricePkr,
  );
  const chargePricePkr = isPromoActive ? Number(plan.promoPricePkr) : plan.pricePkr;
  const savingsPercent =
    isPromoActive && plan.pricePkr > 0
      ? Math.round(((plan.pricePkr - chargePricePkr) / plan.pricePkr) * 100)
      : 0;
  const annualList =
    plan.annualPricePkr != null
      ? plan.annualPricePkr
      : plan.isAddOn
        ? null
        : defaultAnnualPricePkr(plan.pricePkr);
  return {
    ...plan,
    annualPricePkr: annualList ?? undefined,
    listPricePkr: plan.pricePkr,
    chargePricePkr,
    annualChargePricePkr: annualList,
    isPromoActive,
    isComplimentary: isPromoActive && chargePricePkr === 0,
    promoEndsAt: isPromoActive ? endsAt : null,
    savingsPercent,
  };
}

export function getPlan(id: string) {
  return PLANS.find((p) => p.id === id);
}

export async function getLivePlans(now = new Date()) {
  const { getPlanPriceOverrides } = await import("@/lib/site-settings");
  return applyPlanOverrides(await getPlanPriceOverrides()).map((plan) => resolvePlan(plan, now));
}

export async function getLivePlan(id: string, now = new Date()) {
  return (await getLivePlans(now)).find((p) => p.id === id);
}

export function getPriceId(plan: SubscriptionPlan): string | undefined {
  const def = getPlan(plan);
  if (!def) return undefined;
  return process.env[def.envPriceId];
}

export function planFromPriceId(priceId: string): SubscriptionPlan | null {
  for (const plan of PLANS) {
    if (process.env[plan.envPriceId] === priceId) return plan.id;
  }
  return null;
}
