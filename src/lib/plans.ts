import type { SubscriptionPlan } from "@/lib/types";

export type PlanDefinition = {
  id: SubscriptionPlan;
  name: string;
  description: string;
  audience: "student" | "tutor";
  /** Monthly price stored in PKR base units (converted to visitor currency at display/checkout). */
  pricePkr: number;
  features: string[];
  envPriceId: string;
  isAddOn?: boolean;
};

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    id: "STUDENT_PASS",
    name: "Student Pass",
    description: "Unlimited contact with tutors worldwide. Post student request ads.",
    audience: "student",
    pricePkr: 1999,
    features: [
      "Message unlimited tutors",
      "Post “need a tutor” ads",
      "Browse verified tutors",
      "Online or local lessons",
    ],
    envPriceId: "STRIPE_PRICE_STUDENT_PASS",
  },
  {
    id: "TUTOR_BASIC",
    name: "Tutor Basic",
    description: "Publish your profile and up to 3 subject ads.",
    audience: "tutor",
    pricePkr: 1499,
    features: [
      "Public tutor profile",
      "Up to 3 active subject ads",
      "Receive student messages",
      "Respond to student ads",
    ],
    envPriceId: "STRIPE_PRICE_TUTOR_BASIC",
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

export type PlanPriceOverride = {
  pricePkr?: number;
  name?: string;
  description?: string;
};

export function applyPlanOverrides(
  overrides: Record<string, PlanPriceOverride> | null | undefined,
): PlanDefinition[] {
  return DEFAULT_PLANS.map((plan) => {
    const over = overrides?.[plan.id];
    const price = Number(over?.pricePkr);
    return {
      ...plan,
      pricePkr: Number.isFinite(price) && price >= 0 ? Math.round(price) : plan.pricePkr,
      name: over?.name?.trim() || plan.name,
      description: over?.description?.trim() || plan.description,
    };
  });
}

export function getPlan(id: string) {
  return PLANS.find((p) => p.id === id);
}

export async function getLivePlans() {
  const { getPlanPriceOverrides } = await import("@/lib/site-settings");
  return applyPlanOverrides(await getPlanPriceOverrides());
}

export async function getLivePlan(id: string) {
  return (await getLivePlans()).find((p) => p.id === id);
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
