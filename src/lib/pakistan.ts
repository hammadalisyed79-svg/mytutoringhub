/** Pakistan + international marketplace helpers */

export const CURRENCY_LOCAL = "PKR";
export const CURRENCY_INTL = "USD";

/** Approximate display rate for dual labels (update as needed). */
export const PKR_PER_USD = 278;

export function formatPkr(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
}

export function formatUsd(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/** Primary fee storage is PKR; show PKR + approx USD for international visitors. */
export function formatHourly(amountPkr: number | null | undefined) {
  if (amountPkr == null || Number.isNaN(amountPkr)) return "—";
  const usd = amountPkr / PKR_PER_USD;
  return `${formatPkr(amountPkr)}/hr · ~${formatUsd(usd)}/hr`;
}

export function formatHourlyShort(amountPkr: number | null | undefined) {
  if (amountPkr == null || Number.isNaN(amountPkr)) return "—";
  return `${formatPkr(amountPkr)}/hr`;
}

export const MARKET_CITIES = [
  "Online (Worldwide)",
  "Online (Pakistan)",
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "London",
  "Dubai",
  "Riyadh",
  "Toronto",
  "New York",
];
