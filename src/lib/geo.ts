import { countryByCode } from "@/lib/markets";

/** ISO 3166-1 alpha-2 from Vercel, Cloudflare, or proxy geo headers. */
export function getVisitorCountryCode(
  headersList: { get(name: string): string | null },
): string | null {
  const raw =
    headersList.get("x-vercel-ip-country") ||
    headersList.get("cf-ipcountry") ||
    headersList.get("x-country-code");
  if (!raw || raw === "XX" || raw === "T1" || raw.length !== 2) return null;
  return raw.toUpperCase();
}

/**
 * Returns the matching country name from our featured markets dataset,
 * or null if geo cannot be resolved.
 */
export function getUserCountry(headersList: { get(name: string): string | null }): string | null {
  const code = getVisitorCountryCode(headersList);
  if (!code) return null;
  const country = countryByCode(code);
  return country ? country.name : null;
}
