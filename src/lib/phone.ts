import { TOP_COUNTRIES } from "@/lib/markets";

export type PhoneCountry = {
  code: string;
  name: string;
  dial: string;
};

/** ISO country → international dial code (featured markets + common tutoring regions). */
const DIAL_BY_COUNTRY: Record<string, string> = {
  PK: "92",
  IN: "91",
  US: "1",
  GB: "44",
  AE: "971",
  SA: "966",
  CA: "1",
  AU: "61",
  NZ: "64",
  DE: "49",
  HK: "852",
  MY: "60",
  SG: "65",
  QA: "974",
  ZA: "27",
  BD: "880",
  NG: "234",
  EG: "20",
  PH: "63",
  ID: "62",
  TR: "90",
  KW: "965",
  OM: "968",
  BH: "973",
  IE: "353",
  FR: "33",
  NL: "31",
  IT: "39",
  ES: "34",
  JP: "81",
  KR: "82",
  CN: "86",
  TH: "66",
  VN: "84",
  LK: "94",
  NP: "977",
  KE: "254",
  GH: "233",
  MA: "212",
  JO: "962",
  LB: "961",
  IQ: "964",
  BN: "673",
  CH: "41",
  SE: "46",
  NO: "47",
  PL: "48",
  PT: "351",
  MX: "52",
  BR: "55",
};

const DIAL_ENTRIES = Object.entries(DIAL_BY_COUNTRY)
  .map(([code, dial]) => ({ code, dial }))
  .sort((a, b) => b.dial.length - a.dial.length);

export const PHONE_COUNTRIES: PhoneCountry[] = TOP_COUNTRIES.filter((c) => DIAL_BY_COUNTRY[c.code]).map(
  (c) => ({
    code: c.code,
    name: c.name,
    dial: DIAL_BY_COUNTRY[c.code],
  }),
);

export function countryFlag(isoCode: string) {
  const code = isoCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((ch) => 127397 + ch.charCodeAt(0)));
}

export function dialForCountry(countryCode: string) {
  return DIAL_BY_COUNTRY[countryCode.toUpperCase()] || "";
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function stripTrunkPrefix(nationalDigits: string) {
  return nationalDigits.startsWith("0") ? nationalDigits.slice(1) : nationalDigits;
}

export function buildE164(countryCode: string, national: string) {
  const dial = dialForCountry(countryCode);
  if (!dial) return "";
  const nationalDigits = stripTrunkPrefix(digitsOnly(national));
  if (!nationalDigits) return "";
  return `+${dial}${nationalDigits}`;
}

export function detectCountryFromE164(e164: string): string | null {
  const digits = digitsOnly(e164);
  if (!digits) return null;
  for (const entry of DIAL_ENTRIES) {
    if (digits.startsWith(entry.dial)) return entry.code;
  }
  return null;
}

export function parsePhone(value: string, defaultCountryCode = "PK") {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      countryCode: defaultCountryCode.toUpperCase(),
      national: "",
      e164: "",
    };
  }

  let raw = trimmed;
  if (raw.startsWith("00")) raw = `+${raw.slice(2)}`;

  if (raw.startsWith("+")) {
    const digits = digitsOnly(raw);
    const countryCode = detectCountryFromE164(digits) || defaultCountryCode.toUpperCase();
    const dial = dialForCountry(countryCode);
    const national = dial && digits.startsWith(dial) ? digits.slice(dial.length) : digits;
    return {
      countryCode,
      national,
      e164: buildE164(countryCode, national),
    };
  }

  const countryCode = defaultCountryCode.toUpperCase();
  const national = stripTrunkPrefix(digitsOnly(raw));
  return {
    countryCode,
    national,
    e164: buildE164(countryCode, national),
  };
}

export function isValidPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^\+[1-9]\d{6,14}$/.test(trimmed);
}

export function normalizePhone(value: string, defaultCountryCode = "PK") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = parsePhone(trimmed, defaultCountryCode);
  return parsed.e164;
}

export function formatPhoneDisplay(value: string) {
  const parsed = parsePhone(value);
  if (!parsed.e164) return value;
  const dial = dialForCountry(parsed.countryCode);
  if (!dial) return parsed.e164;
  return `+${dial} ${parsed.national}`;
}

export function phonePlaceholder(countryCode: string) {
  switch (countryCode) {
    case "PK":
      return "321 6001040";
    case "GB":
      return "7700 900123";
    case "US":
    case "CA":
      return "555 123 4567";
    case "IN":
      return "98765 43210";
    case "AE":
      return "50 123 4567";
    default:
      return "Mobile number";
  }
}
