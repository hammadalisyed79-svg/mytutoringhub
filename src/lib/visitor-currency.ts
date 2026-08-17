import { headers } from "next/headers";
import {
  currencyFromAcceptLanguage,
  currencyFromCountry,
  type CurrencyCode,
} from "@/lib/currency";

/** Resolve visitor currency from Vercel geo, then Accept-Language, else USD. */
export async function getVisitorCurrency(): Promise<CurrencyCode> {
  const h = await headers();
  const country =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code");
  if (country && country !== "XX" && country !== "T1") {
    return currencyFromCountry(country);
  }
  return currencyFromAcceptLanguage(h.get("accept-language"));
}
