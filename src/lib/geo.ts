import { countryByCode } from "@/lib/markets";

/**
 * Reads the Vercel geo header and returns the matching country name from our
 * dataset, or null if the country cannot be resolved.
 */
export function getUserCountry(headersList: { get(name: string): string | null }): string | null {
  const code = headersList.get("x-vercel-ip-country");
  if (!code || code.length !== 2) return null;
  const country = countryByCode(code);
  return country ? country.name : null;
}
