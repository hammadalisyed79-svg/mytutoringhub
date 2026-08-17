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
    description: "Unlimited contact with tutors across Pakistan and post student request ads.",
    audience: "student",
    priceLabel: "Rs 1,999/month",
    features: [
      "Message unlimited tutors in PK",
      "Post “need a tutor” ads",
      "Browse verified tutors",
      "Leave reviews after contact",
    ],
    envPriceId: "STRIPE_PRICE_STUDENT_PASS",
  },
  {
    id: "TUTOR_BASIC",
    name: "Tutor Basic",
    description: "Publish your profile and receive messages from students & parents.",
    audience: "tutor",
    priceLabel: "Rs 1,499/month",
    features: [
      "Public tutor profile",
      "Appear in Pakistan search results",
      "Receive student messages",
      "Respond to student ads",
    ],
    envPriceId: "STRIPE_PRICE_TUTOR_BASIC",
  },
  {
    id: "VERIFIED_TUTOR",
    name: "Verified Tutor",
    description: "Trusted badge and higher placement for serious parents.",
    audience: "tutor",
    priceLabel: "Rs 2,999/month",
    features: [
      "Verified badge on profile",
      "Higher trust ranking",
      "Stand out in Karachi, Lahore, Islamabad & online",
    ],
    envPriceId: "STRIPE_PRICE_VERIFIED_TUTOR",
    isAddOn: true,
  },
  {
    id: "HIGHLIGHTED_AD",
    name: "Highlighted Listing",
    description: "Boosted placement at the top of search results.",
    audience: "tutor",
    priceLabel: "Rs 1,299/month",
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
