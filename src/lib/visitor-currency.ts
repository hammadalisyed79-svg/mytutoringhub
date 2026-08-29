import { headers } from "next/headers";
import {
  currencyFromAcceptLanguage,
  currencyFromCountry,
  type CurrencyCode,
} from "@/lib/currency";

type VisitorCurrencyOpts = {
  /** Used when CDN geo headers are missing (e.g. tutor profile country code). */
  fallbackCountryCode?: string | null;
  /**
   * Prefer this country for currency even when geo is present.
   * Used on tutor dashboards so rates follow “where you teach from”.
   */
  preferCountryCode?: string | null;
};

/** Resolve visitor currency from preferred country, CDN geo, fallback, then Accept-Language. */
export async function getVisitorCurrency(opts?: VisitorCurrencyOpts): Promise<CurrencyCode> {
  const prefer = opts?.preferCountryCode?.trim();
  if (prefer) {
    return currencyFromCountry(prefer);
  }

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
