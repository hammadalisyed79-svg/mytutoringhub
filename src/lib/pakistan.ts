/** Pakistan localization helpers */

export const CURRENCY_CODE = "PKR";
export const CURRENCY_SYMBOL = "Rs";

export function formatMoney(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—";
  const rounded = Math.round(amount);
  return `${CURRENCY_SYMBOL} ${rounded.toLocaleString("en-PK")}`;
}

export function formatHourly(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `${formatMoney(amount)}/hr`;
}

export const PAKISTAN_CITIES = [
  "Online (Pakistan)",
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Hyderabad",
  "Sialkot",
  "Gujranwala",
];
