/**
 * Thin geo/currency display layer. Canonical plan IDs, names, and PKR amounts live in `plans.ts`.
 * This module only provides country metadata, fee scaling, and helpers that convert from plans.
 */

import { getPlan, type ResolvedPlan } from "@/lib/plans";
import { pkrToCurrency, type CurrencyCode } from "@/lib/currency";
import type { SubscriptionPlan } from "@/lib/types";

export type CountryPricingMeta = {
  currency: CurrencyCode | string;
  currencySymbol: string;
  countryName: string;
  tagline: string;
  /** Approximate local units per 1 USD — used to scale optional service fees only. */
  usdRatio: number;
  fees: {
    firstLesson: number;
    profileBoost: number;
    pastPaperBundle: number;
    groupClassListing: number;
    resourceUpload: number;
  };
};

// Service fee USD base values: 1.99 / 4.99 / 0.99 / 2.99 / 1.49
function scaleFees(ratio: number) {
  return {
    firstLesson: Math.round(1.99 * ratio * 100) / 100,
    profileBoost: Math.round(4.99 * ratio * 100) / 100,
    pastPaperBundle: Math.round(0.99 * ratio * 100) / 100,
    groupClassListing: Math.round(2.99 * ratio * 100) / 100,
    resourceUpload: Math.round(1.49 * ratio * 100) / 100,
  };
}

export const PRICING_BY_COUNTRY: Record<string, CountryPricingMeta> = {
  PK: {
    currency: "PKR",
    currencySymbol: "₨",
    countryName: "Pakistan",
    tagline: "Trusted by tutors across Lahore, Karachi & Islamabad",
    usdRatio: 1500 / 12.99,
    fees: scaleFees(1500 / 12.99),
  },
  IN: {
    currency: "INR",
    currencySymbol: "₹",
    countryName: "India",
    tagline: "Serving students from Mumbai to Delhi",
    usdRatio: 499 / 12.99,
    fees: scaleFees(499 / 12.99),
  },
  NG: {
    currency: "NGN",
    currencySymbol: "₦",
    countryName: "Nigeria",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 3999 / 12.99,
    fees: scaleFees(3999 / 12.99),
  },
  AE: {
    currency: "AED",
    currencySymbol: "د.إ",
    countryName: "UAE",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 19 / 12.99,
    fees: scaleFees(19 / 12.99),
  },
  KE: {
    currency: "KES",
    currencySymbol: "KSh",
    countryName: "Kenya",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 599 / 12.99,
    fees: scaleFees(599 / 12.99),
  },
  MY: {
    currency: "MYR",
    currencySymbol: "RM",
    countryName: "Malaysia",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 19 / 12.99,
    fees: scaleFees(19 / 12.99),
  },
  BD: {
    currency: "BDT",
    currencySymbol: "৳",
    countryName: "Bangladesh",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 399 / 12.99,
    fees: scaleFees(399 / 12.99),
  },
  GB: {
    currency: "GBP",
    currencySymbol: "£",
    countryName: "United Kingdom",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 9.99 / 12.99,
    fees: scaleFees(9.99 / 12.99),
  },
  US: {
    currency: "USD",
    currencySymbol: "$",
    countryName: "United States",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 1,
    fees: scaleFees(1),
  },
  CA: {
    currency: "CAD",
    currencySymbol: "CA$",
    countryName: "Canada",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 14.99 / 12.99,
    fees: scaleFees(14.99 / 12.99),
  },
  AU: {
    currency: "AUD",
    currencySymbol: "A$",
    countryName: "Australia",
    tagline: "Join tutors & students in 50+ countries",
    usdRatio: 16.99 / 12.99,
    fees: scaleFees(16.99 / 12.99),
  },
};

export const DEFAULT_PRICING: CountryPricingMeta = {
  currency: "GBP",
  currencySymbol: "£",
  countryName: "your region",
  tagline: "Join tutors & students in 50+ countries",
  usdRatio: 9.99 / 12.99,
  fees: scaleFees(9.99 / 12.99),
};

/** @deprecated Prefer CountryPricingMeta — kept for older imports. */
export type PricingEntry = CountryPricingMeta;

export function getPricingForCountry(countryCode: string): CountryPricingMeta {
  return PRICING_BY_COUNTRY[countryCode?.toUpperCase()] ?? DEFAULT_PRICING;
}

/** Local monthly/annual amounts derived from `plans.ts` PKR (no second plan catalog). */
export function localPlanAmounts(
  planId: SubscriptionPlan | string,
  currency: CurrencyCode,
  plan?: ResolvedPlan | { pricePkr: number; annualPricePkr?: number; chargePricePkr?: number; annualChargePricePkr?: number | null },
) {
  const resolved = plan ?? getPlan(planId);
  if (!resolved) return null;
  const monthlyPkr =
    "chargePricePkr" in resolved && resolved.chargePricePkr != null
      ? resolved.chargePricePkr
      : resolved.pricePkr;
  const listPkr = resolved.pricePkr;
  const annualPkr =
    ("annualChargePricePkr" in resolved && resolved.annualChargePricePkr != null
      ? resolved.annualChargePricePkr
      : null) ??
    resolved.annualPricePkr ??
    Math.round(listPkr * 9.6);
  return {
    monthly: pkrToCurrency(monthlyPkr, currency),
    annual: pkrToCurrency(annualPkr, currency),
    listMonthly: pkrToCurrency(listPkr, currency),
  };
}

export function formatPrice(value: number, symbol: string): string {
  if (value >= 100) {
    return `${symbol}${Math.round(value).toLocaleString()}`;
  }
  return `${symbol}${value.toFixed(2)}`;
}

export const SUPPORTED_COUNTRIES = [
  { code: "PK", label: "Pakistan (PKR)" },
  { code: "IN", label: "India (INR)" },
  { code: "NG", label: "Nigeria (NGN)" },
  { code: "AE", label: "UAE (AED)" },
  { code: "KE", label: "Kenya (KES)" },
  { code: "MY", label: "Malaysia (MYR)" },
  { code: "BD", label: "Bangladesh (BDT)" },
  { code: "GB", label: "United Kingdom (GBP)" },
  { code: "US", label: "United States (USD)" },
  { code: "CA", label: "Canada (CAD)" },
  { code: "AU", label: "Australia (AUD)" },
  { code: "DEFAULT", label: "Rest of world (GBP)" },
];
