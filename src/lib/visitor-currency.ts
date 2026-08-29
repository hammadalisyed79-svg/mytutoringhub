import { headers } from "next/headers";
import {
  currencyFromAcceptLanguage,
  currencyFromCountry,
  type CurrencyCode,
} from "@/lib/currency";

type VisitorCurrencyOpts = {
  /** Used when CDN geo headers are missing (e.g. tutor profile country code). */
  fallbackCountryCode?: string | null;
};

/** Resolve visitor currency from CDN geo, then optional fallback country, then Accept-Language. */
export async function getVisitorCurrency(opts?: VisitorCurrencyOpts): Promise<CurrencyCode> {
  const h = await headers();
  const country =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code");
  if (country && country !== "XX" && country !== "T1") {
    return currencyFromCountry(country);
  }
  const fallback = opts?.fallbackCountryCode?.trim();
  if (fallback) {
    return currencyFromCountry(fallback);
  }
  return currencyFromAcceptLanguage(h.get("accept-language"));
}
