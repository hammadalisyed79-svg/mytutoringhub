export type PricingEntry = {
  currency: string;
  currencySymbol: string;
  countryName: string;
  tagline: string;
  tutorPro: { monthly: number; annual: number };
  tutorElite: { monthly: number; annual: number };
  studentPlus: { monthly: number; annual: number };
  studentPro: { monthly: number; annual: number };
  fees: {
    firstLesson: number;
    profileBoost: number;
    pastPaperBundle: number;
    groupClassListing: number;
    resourceUpload: number;
  };
};

// Service fee USD base values: 1.99 / 4.99 / 0.99 / 2.99 / 1.49
// Each country's fees scaled by the same ratio as tutorPro monthly vs USD 12.99
function scaleFees(ratio: number) {
  return {
    firstLesson: Math.round(1.99 * ratio * 100) / 100,
    profileBoost: Math.round(4.99 * ratio * 100) / 100,
    pastPaperBundle: Math.round(0.99 * ratio * 100) / 100,
    groupClassListing: Math.round(2.99 * ratio * 100) / 100,
    resourceUpload: Math.round(1.49 * ratio * 100) / 100,
  };
}

export const PRICING_BY_COUNTRY: Record<string, PricingEntry> = {
  PK: {
    currency: "PKR",
    currencySymbol: "₨",
    countryName: "Pakistan",
    tagline: "Trusted by tutors across Lahore, Karachi & Islamabad",
    tutorPro: { monthly: 1500, annual: 14400 },
    tutorElite: { monthly: 2999, annual: 28800 },
    studentPlus: { monthly: 499, annual: 4800 },
    studentPro: { monthly: 999, annual: 9600 },
    fees: scaleFees(1500 / 12.99),
  },
  IN: {
    currency: "INR",
    currencySymbol: "₹",
    countryName: "India",
    tagline: "Serving students from Mumbai to Delhi",
    tutorPro: { monthly: 499, annual: 4800 },
    tutorElite: { monthly: 999, annual: 9600 },
    studentPlus: { monthly: 199, annual: 1920 },
    studentPro: { monthly: 399, annual: 3840 },
    fees: scaleFees(499 / 12.99),
  },
  NG: {
    currency: "NGN",
    currencySymbol: "₦",
    countryName: "Nigeria",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 3999, annual: 38400 },
    tutorElite: { monthly: 7999, annual: 76800 },
    studentPlus: { monthly: 999, annual: 9600 },
    studentPro: { monthly: 1999, annual: 19200 },
    fees: scaleFees(3999 / 12.99),
  },
  AE: {
    currency: "AED",
    currencySymbol: "د.إ",
    countryName: "UAE",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 19, annual: 182 },
    tutorElite: { monthly: 39, annual: 374 },
    studentPlus: { monthly: 9, annual: 86 },
    studentPro: { monthly: 18, annual: 173 },
    fees: scaleFees(19 / 12.99),
  },
  KE: {
    currency: "KES",
    currencySymbol: "KSh",
    countryName: "Kenya",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 599, annual: 5760 },
    tutorElite: { monthly: 1199, annual: 11520 },
    studentPlus: { monthly: 199, annual: 1920 },
    studentPro: { monthly: 399, annual: 3840 },
    fees: scaleFees(599 / 12.99),
  },
  MY: {
    currency: "MYR",
    currencySymbol: "RM",
    countryName: "Malaysia",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 19, annual: 182 },
    tutorElite: { monthly: 39, annual: 374 },
    studentPlus: { monthly: 9, annual: 86 },
    studentPro: { monthly: 18, annual: 173 },
    fees: scaleFees(19 / 12.99),
  },
  BD: {
    currency: "BDT",
    currencySymbol: "৳",
    countryName: "Bangladesh",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 399, annual: 3840 },
    tutorElite: { monthly: 799, annual: 7680 },
    studentPlus: { monthly: 149, annual: 1440 },
    studentPro: { monthly: 299, annual: 2880 },
    fees: scaleFees(399 / 12.99),
  },
  GB: {
    currency: "GBP",
    currencySymbol: "£",
    countryName: "United Kingdom",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 9.99, annual: 95.88 },
    tutorElite: { monthly: 19.99, annual: 191.88 },
    studentPlus: { monthly: 4.99, annual: 47.88 },
    studentPro: { monthly: 9.99, annual: 95.88 },
    fees: scaleFees(9.99 / 12.99),
  },
  US: {
    currency: "USD",
    currencySymbol: "$",
    countryName: "United States",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 12.99, annual: 124.70 },
    tutorElite: { monthly: 24.99, annual: 239.90 },
    studentPlus: { monthly: 5.99, annual: 57.50 },
    studentPro: { monthly: 11.99, annual: 115.10 },
    fees: scaleFees(1),
  },
  CA: {
    currency: "CAD",
    currencySymbol: "CA$",
    countryName: "Canada",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 14.99, annual: 143.90 },
    tutorElite: { monthly: 29.99, annual: 287.90 },
    studentPlus: { monthly: 6.99, annual: 67.10 },
    studentPro: { monthly: 13.99, annual: 134.30 },
    fees: scaleFees(14.99 / 12.99),
  },
  AU: {
    currency: "AUD",
    currencySymbol: "A$",
    countryName: "Australia",
    tagline: "Join tutors & students in 50+ countries",
    tutorPro: { monthly: 16.99, annual: 163.10 },
    tutorElite: { monthly: 32.99, annual: 316.70 },
    studentPlus: { monthly: 7.99, annual: 76.70 },
    studentPro: { monthly: 15.99, annual: 153.50 },
    fees: scaleFees(16.99 / 12.99),
  },
};

export const DEFAULT_PRICING: PricingEntry = {
  currency: "USD",
  currencySymbol: "$",
  countryName: "your region",
  tagline: "Join tutors & students in 50+ countries",
  tutorPro: { monthly: 9.99, annual: 95.88 },
  tutorElite: { monthly: 19.99, annual: 191.88 },
  studentPlus: { monthly: 4.99, annual: 47.88 },
  studentPro: { monthly: 9.99, annual: 95.88 },
  fees: scaleFees(9.99 / 12.99),
};

export function getPricingForCountry(countryCode: string): PricingEntry {
  return PRICING_BY_COUNTRY[countryCode?.toUpperCase()] ?? DEFAULT_PRICING;
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
  { code: "DEFAULT", label: "Rest of world (USD)" },
];
