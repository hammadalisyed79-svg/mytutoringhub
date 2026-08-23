import { CURRICULUM } from "@/lib/curriculum";
import { getVisitorCountryCode } from "@/lib/geo";
import { countryByCode, type MarketCountry } from "@/lib/markets";

export type VisitorRegionCopy = {
  countryCode: string;
  countryName: string;
  city: string;
  searchPlaceholder: string;
  searchQueryPlaceholder: string;
  cityPlaceholder: string;
  levelPlaceholder: string;
  geoCurrencyLine: string;
  curriculaLine: string;
  subjectsLead: string;
  adTitlePlaceholder: string;
  adLevelPlaceholder: string;
};

type RegionHints = {
  city?: string;
  mathsLabel?: string;
  subjectCode?: string;
  onlineTag?: string;
  levelsShort?: string;
  curriculaLine?: string;
  adTitle?: string;
  adLevel?: string;
};

const DEFAULT_COUNTRY_CODE = "GB";

/** Region-specific examples for search placeholders and help text. */
const REGION_HINTS: Record<string, RegionHints> = {
  PK: {
    city: "Islamabad",
    mathsLabel: "Maths",
    subjectCode: "FBISE-HSSC-MATH",
    onlineTag: "IELTS online",
    levelsShort: "Matric, FSc, O Level",
    curriculaLine:
      "From Matric and FSc to Cambridge O Level, FBISE, and university — tutors online or near you, priced locally.",
    adTitle: "Need an FSc Chemistry tutor in Karachi",
    adLevel: "e.g. Matric / FSc / O Level",
  },
  GB: {
    city: "London",
    mathsLabel: "Maths",
    subjectCode: "AQA-GCSE-MATH",
    onlineTag: "IELTS online",
    levelsShort: "GCSE, A Level, 11 Plus",
    curriculaLine:
      "From GCSE and IGCSE to A-Level and university — tutors online or near you, priced locally.",
    adTitle: "Need a GCSE Maths tutor in London",
    adLevel: "e.g. KS3 / GCSE / A Level",
  },
  US: {
    city: "New York",
    mathsLabel: "Math",
    subjectCode: "SAT-HS-MATH",
    onlineTag: "SAT prep online",
    levelsShort: "Middle School, AP, SAT",
    curriculaLine:
      "From middle school to SAT, ACT, AP, and university — tutors online or near you, priced locally.",
    adTitle: "Need an Algebra tutor in New York",
    adLevel: "e.g. Middle School / High School / AP",
  },
  IN: {
    city: "Delhi",
    mathsLabel: "Maths",
    subjectCode: "CBSE-SEC-MATH",
    onlineTag: "IELTS online",
    levelsShort: "CBSE, JEE, NEET",
    curriculaLine:
      "From CBSE and ICSE to JEE, NEET, and university — tutors online or near you, priced locally.",
    adTitle: "Need a CBSE Maths tutor in Delhi",
    adLevel: "e.g. Class 10 / Class 12 / JEE",
  },
  AE: {
    city: "Dubai",
    mathsLabel: "Maths",
    subjectCode: "CIGC-IGCSE-MATH",
    onlineTag: "IB online",
    levelsShort: "IGCSE, IB, A Level",
    curriculaLine:
      "From IGCSE and IB to A-Level and university — tutors online or near you, priced locally.",
    adTitle: "Need an IGCSE Maths tutor in Dubai",
    adLevel: "e.g. IGCSE / IB / A Level",
  },
  AU: {
    city: "Sydney",
    mathsLabel: "Maths",
    subjectCode: "HSC-Y1112-MATH",
    onlineTag: "ATAR online",
    levelsShort: "HSC, ATAR, VCE",
    curriculaLine:
      "From HSC and ATAR to VCE and university — tutors online or near you, priced locally.",
    adTitle: "Need an HSC Maths tutor in Sydney",
    adLevel: "e.g. Year 11 / Year 12 / ATAR",
  },
  CA: {
    city: "Toronto",
    mathsLabel: "Math",
    subjectCode: "AP-HS-CALC",
    onlineTag: "online lessons",
    levelsShort: "Ontario, AP, IB",
    curriculaLine:
      "From provincial curricula to AP, IB, and university — tutors online or near you, priced locally.",
    adTitle: "Need a high school Math tutor in Toronto",
    adLevel: "e.g. Grade 9 / Grade 12 / AP",
  },
  BD: {
    city: "Dhaka",
    mathsLabel: "Maths",
    onlineTag: "IELTS online",
    levelsShort: "SSC, HSC, O Level",
    curriculaLine:
      "From SSC and HSC to Cambridge and university — tutors online or near you, priced locally.",
    adTitle: "Need an HSC Maths tutor in Dhaka",
    adLevel: "e.g. SSC / HSC / O Level",
  },
  NG: {
    city: "Lagos",
    mathsLabel: "Maths",
    onlineTag: "JAMB prep online",
    levelsShort: "WAEC, JAMB, NECO",
    curriculaLine:
      "From WAEC and NECO to JAMB and university — tutors online or near you, priced locally.",
    adTitle: "Need a WAEC Maths tutor in Lagos",
    adLevel: "e.g. SSCE / JAMB / NECO",
  },
  MY: {
    city: "Kuala Lumpur",
    mathsLabel: "Maths",
    subjectCode: "SPM-SEC-MATH",
    onlineTag: "online lessons",
    levelsShort: "SPM, IGCSE, STPM",
    curriculaLine:
      "From SPM and IGCSE to STPM and university — tutors online or near you, priced locally.",
    adTitle: "Need an SPM Maths tutor in Kuala Lumpur",
    adLevel: "e.g. Form 4 / SPM / STPM",
  },
  KE: {
    city: "Nairobi",
    mathsLabel: "Maths",
    onlineTag: "online lessons",
    levelsShort: "KCSE, IGCSE, A Level",
    curriculaLine:
      "From KCSE and IGCSE to A-Level and university — tutors online or near you, priced locally.",
    adTitle: "Need a KCSE Maths tutor in Nairobi",
    adLevel: "e.g. Form 2 / KCSE / A Level",
  },
  SA: {
    city: "Riyadh",
    mathsLabel: "Maths",
    subjectCode: "CIGC-IGCSE-MATH",
    onlineTag: "IELTS online",
    levelsShort: "IGCSE, IB, national curriculum",
    curriculaLine:
      "From IGCSE and IB to national curricula and university — tutors online or near you, priced locally.",
    adTitle: "Need an IGCSE Maths tutor in Riyadh",
    adLevel: "e.g. IGCSE / IB / High School",
  },
};

function curriculumCodeForCountry(countryName: string): string | null {
  const row = CURRICULUM.find((r) => r.country === countryName && /MATH/i.test(r.code));
  return row?.code ?? null;
}

function secondaryCodeExample(): string {
  return "IB-DP-PHY";
}

function buildRegionCopy(code: string, market: MarketCountry, hints: RegionHints = {}): VisitorRegionCopy {
  const city = hints.city ?? market.cities[0] ?? "Online";
  const maths = hints.mathsLabel ?? (code === "US" || code === "CA" ? "Math" : "Maths");
  const subjectCode =
    hints.subjectCode ?? curriculumCodeForCountry(market.name) ?? "CIGC-IGCSE-MATH";
  const onlineTag = hints.onlineTag ?? "online lessons";
  const levelsShort = hints.levelsShort ?? "school, exam prep, and university";
  const curriculaLine =
    hints.curriculaLine ??
    `From local school boards to Cambridge, IB, and university — tutors online or near you, priced locally.`;

  return {
    countryCode: code,
    countryName: market.name,
    city,
    searchPlaceholder: `${maths} ${city}, ${onlineTag}, ${subjectCode}…`,
    searchQueryPlaceholder: `Try “${maths} ${city}”, IELTS, or ${subjectCode}`,
    cityPlaceholder: `${city}, Online…`,
    levelPlaceholder: `${levelsShort}…`,
    geoCurrencyLine: `Rates shown in your local currency · tutors online or in your city · ${levelsShort}, and more`,
    curriculaLine,
    subjectsLead: `School boards, exams, languages, and university subjects across 50+ countries — including ${market.name}. Each listing uses a subject code such as ${subjectCode} or ${secondaryCodeExample()}.`,
    adTitlePlaceholder:
      hints.adTitle ?? `Need a ${market.subjects.find((s) => /math/i.test(s)) || maths} tutor in ${city}`,
    adLevelPlaceholder: hints.adLevel ?? `e.g. ${levelsShort.split(",")[0]?.trim() || "School level"}`,
  };
}

/** Resolve visitor region copy from a country ISO code (for tests and server pages). */
export function getVisitorRegionForCode(countryCode?: string | null): VisitorRegionCopy {
  const code = (countryCode || DEFAULT_COUNTRY_CODE).toUpperCase();
  const market = countryByCode(code) ?? countryByCode(DEFAULT_COUNTRY_CODE)!;
  const hints = REGION_HINTS[code] ?? {};
  return buildRegionCopy(market.code, market, hints);
}

/** Resolve visitor region copy from request headers (Vercel / Cloudflare geo). */
export function getVisitorRegion(headersList: { get(name: string): string | null }): VisitorRegionCopy {
  return getVisitorRegionForCode(getVisitorCountryCode(headersList));
}
