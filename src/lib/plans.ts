import type { SubscriptionPlan } from "@/lib/types";

export type PlanDefinition = {
  id: SubscriptionPlan;
  name: string;
  description: string;
  audience: "student" | "tutor";
  /** Monthly list price stored in PKR base units (converted at display/checkout). */
  pricePkr: number;
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
  isPromoActive: boolean;
  isComplimentary: boolean;
  promoEndsAt: Date | null;
  savingsPercent: number;
};

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    id: "STUDENT_PASS",
    name: "Student Pass",
    description: "Unlimited tutor contacts and student request ads. Free accounts get 3 contacts/month.",
    audience: "student",
    pricePkr: 1999,
    features: [
      "Unlimited new tutor contacts",
      "Post “need a tutor” ads",
      "Browse verified tutors",
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
    features: [
      "Everything in Student Pass",
      "AI study assistant",
      "Unlimited tutor contacts",
      "Post “need a tutor” ads",
    ],
    envPriceId: "STRIPE_PRICE_STUDENT_PRO",
  },
  {
    id: "TUTOR_BASIC",
    name: "Tutor Basic",
    description: "Publish your profile and message students without monthly reveal limits.",
    audience: "tutor",
    pricePkr: 1499,
    features: [
      "Public tutor profile in search",
      "Unlimited enquiry reveals when contacting students",
      "Up to 3 active subject ads",
      "Receive student messages (free listed tutors always can)",
    ],
    envPriceId: "STRIPE_PRICE_TUTOR_BASIC",
    promoEnabled: true,
    promoPricePkr: 0,
    promoUntil: "2026-09-30",
    promoLabel: "Launch offer",
    promoNote:
      "Complimentary listing until 30 September 2026. Verified badge, highlight, and ad boost remain paid add-ons. Free listed tutors still receive messages and get 5 enquiry reveals/month.",
  },
  {
    id: "VERIFIED_TUTOR",
    name: "Verified Tutor",
    description: "Priority verification review and trusted badge.",
    audience: "tutor",
    pricePkr: 2999,
    features: [
      "Verified badge on profile",
      "Priority verification queue",
      "Higher trust ranking",
    ],
    envPriceId: "STRIPE_PRICE_VERIFIED_TUTOR",
    isAddOn: true,
  },
  {
    id: "HIGHLIGHTED_AD",
    name: "Highlighted Listing",
    description: "Highlighted badge and top placement for 30 days.",
    audience: "tutor",
    pricePkr: 1299,
    features: ["Highlighted badge", "Higher search placement for 30 days"],
    envPriceId: "STRIPE_PRICE_HIGHLIGHTED_AD",
    isAddOn: true,
  },
  {
    id: "AD_BOOST",
    name: "Ad Boost",
    description: "Periodic top-of-list boosts for 30 days.",
    audience: "tutor",
    pricePkr: 999,
    features: ["Boost window for 30 days", "Extra visibility in search"],
    envPriceId: "STRIPE_PRICE_AD_BOOST",
    isAddOn: true,
  },
  {
    id: "UNLIMITED_ADS",
    name: "Unlimited Ads",
    description: "Post more than 3 active subject ads.",
    audience: "tutor",
    pricePkr: 1999,
    features: ["Unlimited active subject ads", "Reach more niches and cities"],
    envPriceId: "STRIPE_PRICE_UNLIMITED_ADS",
    isAddOn: true,
  },
];

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
    return {
      ...plan,
      pricePkr: Number.isFinite(price) && price >= 0 ? Math.round(price) : plan.pricePkr,
      name: over?.name?.trim() || plan.name,
      description: over?.description?.trim() || plan.description,
      promoEnabled: over?.promoEnabled ?? plan.promoEnabled ?? false,
      promoPricePkr: Number.isFinite(promoPrice) && promoPrice >= 0 ? Math.round(promoPrice) : plan.promoPricePkr,
      promoUntil: over?.promoUntil || plan.promoUntil,
      promoLabel: over?.promoLabel?.trim() || plan.promoLabel,
      promoNote: over?.promoNote?.trim() || plan.promoNote,
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
  return {
    ...plan,
    listPricePkr: plan.pricePkr,
    chargePricePkr,
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
