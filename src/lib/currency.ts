/** Global currency helpers — amounts in the DB are stored in PKR (legacy base unit). */

import { MARKET_CITIES_BY_COUNTRY_CODE } from "@/lib/market-locations";

export type CurrencyCode =
  | "USD"
  | "PKR"
  | "GBP"
  | "EUR"
  | "AED"
  | "SAR"
  | "CAD"
  | "AUD"
  | "INR"
  | "QAR"
  | "KWD"
  | "BHD"
  | "OMR"
  | "MYR"
  | "SGD"
  | "NZD"
  | "ZAR"
  | "TRY"
  | "EGP"
  | "NGN"
  | "KES"
  | "BDT"
  | "PHP"
  | "THB"
  | "IDR"
  | "HKD"
  | "JPY"
  | "CNY"
  | "CHF"
  | "SEK"
  | "NOK"
  | "DKK"
  | "PLN"
  | "BRL"
  | "MXN";

/** Approximate units of each currency per 1 USD (for display + Safepay conversion). */
export const FX_PER_USD: Record<CurrencyCode, number> = {
  USD: 1,
  PKR: 278,
  GBP: 0.79,
  EUR: 0.92,
  AED: 3.67,
  SAR: 3.75,
  CAD: 1.36,
  AUD: 1.53,
  INR: 83.5,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  MYR: 4.7,
  SGD: 1.34,
  NZD: 1.66,
  ZAR: 18.2,
  TRY: 32.5,
  EGP: 48,
  NGN: 1550,
  KES: 129,
  BDT: 110,
  PHP: 56,
  THB: 35.5,
  IDR: 15800,
  HKD: 7.82,
  JPY: 151,
  CNY: 7.25,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.9,
  PLN: 3.95,
  BRL: 5.1,
  MXN: 17.2,
};

/** Currencies Safepay commonly accepts for checkout (fallback USD). */
export const SAFEPAY_CURRENCIES = new Set<CurrencyCode>([
  "PKR",
  "USD",
  "GBP",
  "EUR",
  "AED",
  "SAR",
  "CAD",
  "AUD",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
]);

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  PK: "PKR",
  US: "USD",
  GB: "GBP",
  UK: "GBP",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  FI: "EUR",
  GR: "EUR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  IN: "INR",
  MY: "MYR",
  SG: "SGD",
  ZA: "ZAR",
  TR: "TRY",
  EG: "EGP",
  NG: "NGN",
  KE: "KES",
  BD: "BDT",
  PH: "PHP",
  TH: "THB",
  ID: "IDR",
  HK: "HKD",
  JP: "JPY",
  CN: "CNY",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  BR: "BRL",
  MX: "MXN",
};

const ZERO_DECIMAL = new Set<CurrencyCode>(["JPY"]);

export function currencyFromCountry(countryCode: string | null | undefined): CurrencyCode {
  if (!countryCode) return "USD";
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "USD";
}

export function currencyFromAcceptLanguage(header: string | null | undefined): CurrencyCode {
  if (!header) return "USD";
  const primary = header.split(",")[0]?.trim() || "";
  const region = primary.split("-")[1]?.toUpperCase();
  // Only trust explicit region tags (en-PK → PKR, fr-FR → EUR). Bare languages like
  // "fr" or "de" used to force EUR and mis-price visitors when geo headers are missing.
  if (region && COUNTRY_CURRENCY[region]) return COUNTRY_CURRENCY[region];
  const lang = primary.split("-")[0]?.toLowerCase();
  if (lang === "ur" || lang === "pa") return "PKR";
  return "USD";
}

export function pkrToUsd(amountPkr: number) {
  return amountPkr / FX_PER_USD.PKR;
}

export function usdToCurrency(amountUsd: number, currency: CurrencyCode) {
  return amountUsd * FX_PER_USD[currency];
}

export function pkrToCurrency(amountPkr: number, currency: CurrencyCode) {
  return usdToCurrency(pkrToUsd(amountPkr), currency);
}

export function currencyToPkr(amount: number, currency: CurrencyCode) {
  if (!Number.isFinite(amount)) return 0;
  if (currency === "PKR") return amount;
  return (amount / FX_PER_USD[currency]) * FX_PER_USD.PKR;
}

export function formatMoney(amount: number, currency: CurrencyCode, locale = "en") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Currency display for Hub Points — adds decimals when 2 places would show 0.00. */
export function formatHubPointsMoney(amountPkr: number, currency: CurrencyCode, locale = "en") {
  const local = pkrToCurrency(amountPkr, currency);
  if (!Number.isFinite(local) || amountPkr === 0) {
    return formatMoney(0, currency, locale);
  }

  if (ZERO_DECIMAL.has(currency)) {
    const value = local < 1 ? 1 : Math.round(local);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  for (let digits = 2; digits <= 6; digits++) {
    if (Number(local.toFixed(digits)) > 0) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(local);
    }
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(local);
}

/** Tutor/ad fees are stored in PKR base units; show in the visitor currency. */
export function formatHourly(amountPkr: number | null | undefined, currency: CurrencyCode = "USD") {
  if (amountPkr == null || Number.isNaN(amountPkr)) return "—";
  const local = pkrToCurrency(amountPkr, currency);
  return `${formatMoney(local, currency)}/hr`;
}

/** Minimum listable hourly rate in PKR (server + form validation). */
export const MIN_HOURLY_RATE_PKR = 500;

/** Default starter rate in PKR when a new tutor profile is created. */
export const DEFAULT_HOURLY_RATE_PKR = 1500;

/** Convert a stored PKR rate into a form input value in the visitor currency. */
export function hourlyRateInputValue(amountPkr: number, currency: CurrencyCode): string {
  if (currency === "PKR") return String(Math.round(amountPkr));
  const local = pkrToCurrency(amountPkr, currency);
  if (!Number.isFinite(local)) return "";
  // Integer-friendly form values (matches hourlyRateInputStep / HTML number validation).
  return String(Math.max(1, Math.round(local)));
}

/** Convert a form input (visitor currency) back to whole PKR for storage. */
export function hourlyRateInputToPkr(amountLocal: number, currency: CurrencyCode): number {
  if (!Number.isFinite(amountLocal) || amountLocal < 0) return 0;
  return Math.round(currencyToPkr(amountLocal, currency));
}

/**
 * Minimum input amount in visitor currency that still meets MIN_HOURLY_RATE_PKR.
 * Ceiled to a whole number so HTML `step=1` accepts ordinary integer rates (e.g. €10).
 */
export function minHourlyRateInput(currency: CurrencyCode): number {
  if (currency === "PKR") return MIN_HOURLY_RATE_PKR;
  const local = pkrToCurrency(MIN_HOURLY_RATE_PKR, currency);
  return Math.max(1, Math.ceil(local));
}

/** HTML number input step — whole units for display currencies; 100 PKR for PKR. */
export function hourlyRateInputStep(currency: CurrencyCode): number {
  if (currency === "PKR") return 100;
  return 1;
}

export function formatPlanPrice(
  amountPkr: number,
  currency: CurrencyCode,
  period: "month" | "year" = "month",
) {
  const local = pkrToCurrency(amountPkr, currency);
  const suffix = period === "year" ? "/yr" : "/mo";
  return `${formatMoney(local, currency)}${suffix}`;
}

/** One-off past paper download price (not a subscription). */
export function formatPaperDownloadFee(amountPkr: number, currency: CurrencyCode) {
  const local = pkrToCurrency(amountPkr, currency);
  return formatMoney(local, currency);
}

/** Minor units for Safepay (cents/paisa). */
export function toSafepayMinorUnits(amountMajor: number, currency: CurrencyCode) {
  if (ZERO_DECIMAL.has(currency)) return Math.round(amountMajor);
  return Math.round(amountMajor * 100);
}

export function checkoutCurrency(preferred: CurrencyCode): CurrencyCode {
  return SAFEPAY_CURRENCIES.has(preferred) ? preferred : "USD";
}

/** Format `safepay_USD_1999` (minor units) stored on Subscription.stripePriceId. */
export function formatSafepayPriceId(stripePriceId: string | null | undefined) {
  if (!stripePriceId) return null;
  const match = /^safepay_([A-Z]{3})_(\d+)$/.exec(stripePriceId);
  if (!match) return null;
  const currency = match[1] as CurrencyCode;
  const minor = Number(match[2]);
  const major = ZERO_DECIMAL.has(currency) ? minor : minor / 100;
  return formatMoney(major, currency);
}

export const MARKET_CITIES = [
  "Online",
  ...Array.from(new Set(Object.values(MARKET_CITIES_BY_COUNTRY_CODE).flat())),
];
