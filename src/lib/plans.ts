import type { SubscriptionPlan } from "@/lib/types";

export type PlanDefinition = {
  id: SubscriptionPlan;
  name: string;
  description: string;
  audience: "student" | "tutor";
  priceLabel: string;
  features: string[];
  envPriceId: string;
  isAddOn?: boolean;
};

export const PLANS: PlanDefinition[] = [
  {
    id: "STUDENT_PASS",
    name: "Student Pass",
    description: "Unlimited contact with tutors and post student request ads.",
    audience: "student",
    priceLabel: "$19/month",
    features: [
      "Message unlimited tutors",
      "Post “need a tutor” ads",
      "Browse verified tutors",
      "Leave reviews after contact",
    ],
    envPriceId: "STRIPE_PRICE_STUDENT_PASS",
  },
  {
    id: "TUTOR_BASIC",
    name: "Tutor Basic",
    description: "Publish your profile and receive student messages.",
    audience: "tutor",
    priceLabel: "$15/month",
    features: [
      "Public tutor profile",
      "Appear in search results",
      "Receive student messages",
      "Respond to student ads",
    ],
    envPriceId: "STRIPE_PRICE_TUTOR_BASIC",
  },
  {
    id: "VERIFIED_TUTOR",
    name: "Verified Tutor",
    description: "Trusted badge and higher placement in search.",
    audience: "tutor",
    priceLabel: "$29/month",
    features: [
      "Verified badge on profile",
      "Higher trust ranking",
      "Stand out to parents & students",
    ],
    envPriceId: "STRIPE_PRICE_VERIFIED_TUTOR",
    isAddOn: true,
  },
  {
    id: "HIGHLIGHTED_AD",
    name: "Highlighted Listing",
    description: "Boosted placement at the top of search results.",
    audience: "tutor",
    priceLabel: "$12/month",
    features: ["Highlighted in search", "More profile views", "Priority visibility"],
    envPriceId: "STRIPE_PRICE_HIGHLIGHTED_AD",
    isAddOn: true,
  },
];

export function getPlan(id: string) {
  return PLANS.find((p) => p.id === id);
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
