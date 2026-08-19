import { MARKET_CITIES } from "@/lib/currency";
import { SUBJECT_CODES, TOP_COUNTRIES, allMarketCities, countryByCode, countryByName } from "@/lib/markets";

export const SEARCH_LANGUAGES = [
  "English",
  "Urdu",
  "Arabic",
  "Hindi",
  "Punjabi",
  "French",
  "Spanish",
  "German",
  "Mandarin",
  "Chinese",
  "Malay",
  "Afrikaans",
  "Bengali",
  "Turkish",
];

export const SEARCH_LEVELS = [
  "Primary",
  "Middle School",
  "Matric",
  "SSC",
  "O Level",
  "IGCSE",
  "GCSE",
  "Intermediate",
  "HSSC",
  "AS Level",
  "A Level",
  "IB",
  "AP",
  "SAT",
  "University",
];

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  america: "United States",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  uae: "United Arab Emirates",
  ksa: "Saudi Arabia",
  saudi: "Saudi Arabia",
};

const CITY_ALIASES: Record<string, string> = {
  islam: "Islamabad",
  isl: "Islamabad",
  isb: "Islamabad",
  isbd: "Islamabad",
  islm: "Islamabad",
  rwp: "Rawalpindi",
  pindi: "Rawalpindi",
  lhr: "Lahore",
  khi: "Karachi",
  kci: "Karachi",
  kch: "Karachi",
  mux: "Multan",
  pew: "Peshawar",
  dxb: "Dubai",
  auh: "Abu Dhabi",
  jed: "Jeddah",
  ruh: "Riyadh",
  nyc: "New York",
  ny: "New York",
  la: "Los Angeles",
  lon: "London",
  ldn: "London",
  bom: "Mumbai",
  del: "Delhi",
  blr: "Bangalore",
  bengaluru: "Bangalore",
  sg: "Singapore",
  kl: "Kuala Lumpur",
};

const SUBJECT_ALIASES: Record<string, string> = {
  math: "Mathematics",
  maths: "Mathematics",
  mathematics: "Mathematics",
  mathmatics: "Mathematics",
  phy: "Physics",
  physics: "Physics",
  phys: "Physics",
  chem: "Chemistry",
  chemistry: "Chemistry",
  bio: "Biology",
  biology: "Biology",
  eng: "English",
  english: "English",
  urdu: "Urdu",
  arabic: "Arabic",
  arabi: "Arabic",
  cs: "Computer Science",
  ict: "Computer Science",
  computing: "Computer Science",
  "computer science": "Computer Science",
  islamiyat: "Islamic Studies",
  islamiat: "Islamic Studies",
  "islamic studies": "Islamic Studies",
  islam: "Islamic Studies",
  ielts: "IELTS",
  sat: "SAT Prep",
  "sat prep": "SAT Prep",
  act: "ACT Prep",
  css: "CSS Prep",
  "css prep": "CSS Prep",
  jee: "JEE Prep",
  neet: "NEET Prep",
  quran: "Quran Nazra",
  nazra: "Quran Nazra",
  acc: "Accounting",
  accounts: "Accounting",
  accounting: "Accounting",
  econ: "Economics",
  economics: "Economics",
  biz: "Business",
  business: "Business",
  french: "French",
  spanish: "Spanish",
  german: "German",
};

function norm(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

export function scoreSuggestion(query: string, candidate: string) {
  const q = norm(query);
  const c = norm(candidate);
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q)) return 90 - Math.min(q.length, 20);
  if (c.includes(` ${q}`) || c.includes(q)) return 70;
  const dist = levenshtein(q, c.slice(0, Math.max(q.length, 1)));
  const maxDist = q.length <= 4 ? 1 : 2;
  if (dist <= maxDist) return 55 - dist * 10;
  return 0;
}

export function cityChoices() {
  return [...new Set([...allMarketCities(), ...MARKET_CITIES])];
}

function inPool(value: string, pool?: string[]) {
  if (!pool?.length) return true;
  return pool.some((item) => item.toLowerCase() === value.toLowerCase());
}

export function countryChoices() {
  return TOP_COUNTRIES.map((country) => country.name);
}

export function resolveCountry(input: string | undefined) {
  const raw = (input || "").trim();
  if (!raw) return { value: "", matched: false, label: "" };
  if (raw.length === 2) {
    const byCode = countryByCode(raw);
    if (byCode) return { value: byCode.name, matched: true, label: byCode.name };
  }
  const aliased = COUNTRY_ALIASES[norm(raw)];
  if (aliased) return { value: aliased, matched: true, label: aliased };
  const exact = countryByName(raw);
  if (exact) return { value: exact.name, matched: true, label: exact.name };
  const ranked = TOP_COUNTRIES.map((country) => ({
    country,
    score: scoreSuggestion(raw, country.name),
  }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const qLen = norm(raw).length;
  const confident =
    top &&
    (top.score >= 90 || (top.score >= 70 && qLen >= 4)) &&
    (!ranked[1] || top.score - ranked[1].score >= 8);
  if (confident && top) {
    return { value: top.country.name, matched: true, label: top.country.name };
  }
  return { value: raw, matched: false, label: raw };
}

export function suggestCountries(query: string, limit = 12) {
  const names = countryChoices();
  const q = query.trim();
  if (!q) return names.slice(0, limit);
  return names
    .map((name) => ({
      name,
      score: Math.max(
        scoreSuggestion(q, name),
        COUNTRY_ALIASES[norm(q)] === name ? 95 : 0,
        countryByCode(q)?.name === name ? 100 : 0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.name);
}

export function resolveCity(input: string | undefined, pool?: string[]) {
  const raw = (input || "").trim();
  if (!raw) return { value: "", matched: false, label: "" };
  if (/^online$/i.test(raw) && inPool("Online", pool)) {
    return { value: "Online", matched: true, label: "Online" };
  }
  const key = norm(raw).replace(/\s/g, "");
  const aliased = CITY_ALIASES[key] || CITY_ALIASES[norm(raw)];
  if (aliased && inPool(aliased, pool)) return { value: aliased, matched: true, label: aliased };
  const cities = pool?.length ? pool : cityChoices();
  const ranked = cities
    .map((city) => ({ city, score: scoreSuggestion(raw, city) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked[0] && ranked[0].score >= 70) {
    return { value: ranked[0].city, matched: true, label: ranked[0].city };
  }
  if (ranked[0] && ranked[0].score >= 45 && (!ranked[1] || ranked[0].score - ranked[1].score >= 10)) {
    return { value: ranked[0].city, matched: true, label: ranked[0].city };
  }
  return { value: raw, matched: false, label: raw };
}

export function resolveSubjectName(input: string | undefined, subjectNames: string[] = []) {
  const raw = (input || "").trim();
  if (!raw) return { value: "", matched: false };
  const aliased = SUBJECT_ALIASES[norm(raw)];
  if (aliased) return { value: aliased, matched: true };
  const fromCode = Object.entries(SUBJECT_CODES).find(([, code]) => code.toLowerCase() === raw.toLowerCase());
  if (fromCode) return { value: fromCode[0], matched: true };
  const names = subjectNames.length ? subjectNames : Object.keys(SUBJECT_CODES);
  const ranked = names
    .map((name) => ({ name, score: scoreSuggestion(raw, name) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked[0] && ranked[0].score >= 70) return { value: ranked[0].name, matched: true };
  return { value: raw, matched: false };
}

export function expandSubjectTerms(subject: string) {
  const canonical = resolveSubjectName(subject).value || subject;
  const terms = new Set<string>([canonical]);
  for (const [alias, name] of Object.entries(SUBJECT_ALIASES)) {
    if (name.toLowerCase() === canonical.toLowerCase() && alias.length >= 4 && alias !== canonical.toLowerCase()) {
      terms.add(alias);
    }
  }
  return [...terms];
}

export function suggestCities(query: string, limit = 8, pool?: string[]) {
  const q = query.trim();
  const cities = pool?.length ? pool : cityChoices();
  if (!q) {
    const online = cities.filter((city) => city === "Online");
    const rest = cities.filter((city) => city !== "Online");
    return [...online, ...rest].slice(0, limit);
  }
  return cities
    .map((city) => ({
      city,
      score: Math.max(scoreSuggestion(q, city), CITY_ALIASES[norm(q)] === city && inPool(city, pool) ? 95 : 0),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.city);
}

export function suggestSubjects(query: string, subjectNames: string[], limit = 8) {
  const q = query.trim();
  if (!q) return subjectNames.slice(0, limit);
  return subjectNames
    .map((name) => ({
      name,
      score: Math.max(
        scoreSuggestion(q, name),
        scoreSuggestion(q, SUBJECT_CODES[name] || ""),
        SUBJECT_ALIASES[norm(q)] === name ? 95 : 0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.name);
}

export function parseSearchQuery(input: string) {
  let text = input.trim();
  const out: {
    q?: string;
    subject?: string;
    location?: string;
    country?: string;
    mode?: string;
    level?: string;
  } = {};
  if (!text) return out;

  if (/\bonline\b/i.test(text)) {
    out.mode = "online";
    text = text.replace(/\bonline\b/gi, " ");
  }
  if (/\b(in[- ]person|home tuition|home tutor)\b/i.test(text)) {
    out.mode = "inperson";
    text = text.replace(/\b(in[- ]person|home tuition|home tutor)\b/gi, " ");
  }

  text = text.replace(/\bin\s+/gi, " ").replace(/\s+/g, " ").trim();
  const tokens = text.split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    const lastTwo = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
    const city = resolveCity(lastTwo);
    if (city.matched) {
      out.location = city.value;
      tokens.splice(-2, 2);
    }
  }
  if (!out.location && tokens.length) {
    const last = tokens[tokens.length - 1];
    const city = resolveCity(last);
    if (city.matched) {
      out.location = city.value;
      tokens.pop();
    }
  }
  if (tokens.length >= 2) {
    const lastTwo = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
    const nation = resolveCountry(lastTwo);
    if (nation.matched) {
      out.country = nation.value;
      tokens.splice(-2, 2);
    }
  }
  if (!out.country && tokens.length) {
    const last = tokens[tokens.length - 1];
    const nation = resolveCountry(last);
    if (nation.matched) {
      out.country = nation.value;
      tokens.pop();
    }
  }

  const rest = tokens.join(" ").trim();
  if (rest) {
    const subject = resolveSubjectName(rest);
    if (subject.matched) out.subject = subject.value;
    else out.q = rest;
  }
  return out;
}

export function relatedSubjects(subject: string, subjectNames: string[]) {
  const languages = ["Arabic", "English", "Urdu", "French", "Spanish", "German", "Chinese", "Spoken English"];
  if (languages.some((name) => name.toLowerCase() === subject.toLowerCase())) {
    return languages.filter((name) => name.toLowerCase() !== subject.toLowerCase()).slice(0, 4);
  }
  const stem = subject.split(" ")[0];
  return subjectNames
    .filter((name) => name !== subject && name.toLowerCase().includes(stem.toLowerCase()))
    .slice(0, 4);
}
