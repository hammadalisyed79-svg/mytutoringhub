import { TOP_COUNTRIES } from "@/lib/markets";
import { SEARCH_LANGUAGES, SEARCH_LEVELS } from "@/lib/search-smart";
import { curriculumExams } from "@/lib/curriculum";

export const TUTOR_CORE_LEVELS = [
  "Primary",
  "Middle / lower secondary",
  "Matric / SSC",
  "O Level",
  "IGCSE",
  "GCSE",
  "FSc / HSSC / Intermediate",
  "AS Level",
  "A Level",
  "IB",
  "AP",
  "University",
  "Adult learners",
  "Exam prep",
] as const;

export const TUTOR_CORE_LANGUAGES = [
  "English",
  "Urdu",
  "Punjabi",
  "Pashto",
  "Sindhi",
  "Arabic",
  "Hindi",
] as const;

const EXTRA_LANGUAGES = [
  ...SEARCH_LANGUAGES,
  "Balochi",
  "Saraiki",
  "Kashmiri",
  "Persian",
  "Turkish",
  "French",
  "Spanish",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Japanese",
  "Korean",
  "Mandarin",
  "Cantonese",
  "Malay",
  "Indonesian",
  "Bengali",
  "Tamil",
  "Telugu",
  "Gujarati",
  "Thai",
  "Vietnamese",
  "Dutch",
  "Greek",
  "Polish",
  "Swahili",
  "Tagalog",
  "Afrikaans",
];

const EXTRA_CITIES: Record<string, string[]> = {
  Pakistan: [
    "Rawalpindi",
    "Faisalabad",
    "Peshawar",
    "Multan",
    "Quetta",
    "Hyderabad",
    "Sialkot",
    "Gujranwala",
    "Abbottabad",
    "Bahawalpur",
  ],
  India: ["Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"],
  "United Kingdom": ["Leeds", "Glasgow", "Edinburgh"],
  "United States": ["Chicago", "Dallas", "San Francisco"],
  "United Arab Emirates": ["Ajman", "Al Ain"],
  Canada: ["Ottawa", "Montreal"],
  Australia: ["Perth", "Adelaide"],
};

export const GENERIC_EXPERTISE = [
  "Exam technique",
  "Past-paper practice",
  "Homework support",
  "Concept building",
  "Crash courses",
  "Weekly tests",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Special educational needs",
  "Gifted & high achievers",
  "Interview prep",
  "Scholarship prep",
];

const EXACT_EXPERTISE: Record<string, string[]> = {
  IELTS: [
    "Academic",
    "General Training",
    "Listening",
    "Reading",
    "Writing Task 1",
    "Writing Task 2",
    "Speaking",
    "Band 7+",
  ],
  "SAT Prep": ["Math", "Reading and Writing", "Digital SAT", "Practice tests"],
  "ACT Prep": ["English", "Math", "Reading", "Science", "Writing"],
  "CSS Prep": ["English essay", "Current affairs", "Pakistan affairs", "Optional subjects", "Interview"],
  "JEE Prep": ["Physics", "Chemistry", "Mathematics", "Mock tests"],
  "NEET Prep": ["Physics", "Chemistry", "Biology", "Mock tests"],
  "Spoken English": ["Conversation", "Pronunciation", "Business English", "Interview English"],
  "Quran Nazra": ["Nazra", "Tajweed", "Hifz support", "Translation"],
  "Computer Science": ["Programming", "Python", "Java", "Web development", "Databases", "OOP", "Algorithms"],
  Accounting: ["Financial accounting", "Management accounting", "Tax", "Bookkeeping"],
  Economics: ["Microeconomics", "Macroeconomics", "Development economics", "Exam essays"],
  "Pakistan Studies": ["History", "Geography", "Civics", "Current issues"],
  Islamiyat: ["Quran", "Hadith", "Fiqh", "Islamic history", "Exam answers"],
};

type SkillRule = { test: RegExp; skills: string[] };

const SKILL_RULES: SkillRule[] = [
  {
    test: /math|algebra|calculus|statistic|further math|add(itional)? math/i,
    skills: [
      "Arithmetic",
      "Algebra",
      "Geometry",
      "Trigonometry",
      "Calculus",
      "Statistics & probability",
      "Mechanics (applied maths)",
      "Problem solving",
    ],
  },
  {
    test: /physics|physical science/i,
    skills: [
      "Mechanics",
      "Electricity & magnetism",
      "Waves & optics",
      "Thermal physics",
      "Modern physics",
      "Practicals / experiments",
    ],
  },
  {
    test: /chem/i,
    skills: ["Physical chemistry", "Organic chemistry", "Inorganic chemistry", "Analytical chemistry", "Practicals"],
  },
  {
    test: /bio|life science/i,
    skills: ["Cell biology", "Genetics", "Human physiology", "Ecology", "Plant biology", "Practicals"],
  },
  {
    test: /english language arts|^english$|english language/i,
    skills: ["Grammar", "Writing", "Literature", "Comprehension", "Speaking", "Creative writing"],
  },
  {
    test: /urdu/i,
    skills: ["Grammar", "Essay writing", "Literature", "Translation", "Spoken Urdu"],
  },
  {
    test: /french|spanish|german|arabic|chinese|mandarin|japanese|hindi|bangla|afrikaans|bahasa/i,
    skills: ["Speaking", "Listening", "Reading", "Writing", "Grammar", "Exam oral"],
  },
  {
    test: /computer|computing|programming|ict/i,
    skills: ["Programming", "Python", "Java", "Web development", "Databases", "Theory"],
  },
  {
    test: /history/i,
    skills: ["Source analysis", "Essay writing", "World history", "Regional history"],
  },
  {
    test: /geography/i,
    skills: ["Physical geography", "Human geography", "Map skills", "Case studies"],
  },
  {
    test: /business|commerce/i,
    skills: ["Marketing", "Finance", "Operations", "Case studies", "Exam essays"],
  },
  {
    test: /psychology/i,
    skills: ["Research methods", "Approaches", "Issues & debates", "Exam essays"],
  },
  {
    test: /music|piano|guitar/i,
    skills: ["Theory", "Performance", "Grade exams", "Beginner technique"],
  },
];

export function splitCsv(value?: string | null) {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinCsv(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.join(", ");
}

export function toggleCsvValue(value: string, token: string) {
  const parts = splitCsv(value);
  const has = parts.some((p) => p.toLowerCase() === token.toLowerCase());
  return joinCsv(has ? parts.filter((p) => p.toLowerCase() !== token.toLowerCase()) : [...parts, token]);
}

export function csvHas(value: string, token: string) {
  return splitCsv(value).some((p) => p.toLowerCase() === token.toLowerCase());
}

function uniqueSorted(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function tutorCountries() {
  return TOP_COUNTRIES.map((country) => country.name);
}

function uniquePreserveOrder(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function citiesForCountry(countryName: string) {
  const country = TOP_COUNTRIES.find((row) => row.name === countryName);
  // Alphabetical for profile dropdowns / letter grouping.
  return uniqueSorted(["Online", ...(country?.cities || []), ...(EXTRA_CITIES[countryName] || [])]);
}

/** Online first, then curated market order (not alphabetical) — used by tutor search suggestions. */
export function citiesForSearchCountry(countryName: string) {
  if (!countryName) return [];
  const country = TOP_COUNTRIES.find((row) => row.name === countryName);
  const curated = uniquePreserveOrder([
    "Online",
    ...(country?.cities || []),
    ...(EXTRA_CITIES[countryName] || []),
  ]);
  return curated;
}

export function cityBelongsToCountry(city: string, countryName: string) {
  const value = city.trim();
  if (!value || /^online$/i.test(value)) return true;
  if (!countryName) return true;
  return citiesForCountry(countryName).some((item) => item.toLowerCase() === value.toLowerCase());
}

export function inferTutorCountry(location?: string | null, country?: string | null) {
  if (country) {
    const listed = tutorCountries().find((name) => name.toLowerCase() === country.trim().toLowerCase());
    if (listed) return listed;
  }
  const hay = (location || "").trim().toLowerCase();
  if (!hay || hay === "online") return "";
  for (const row of TOP_COUNTRIES) {
    if (hay.includes(row.name.toLowerCase())) return row.name;
    if (row.cities.some((city) => hay.includes(city.toLowerCase()))) return row.name;
    const extra = EXTRA_CITIES[row.name] || [];
    if (extra.some((city) => hay.includes(city.toLowerCase()))) return row.name;
  }
  return "";
}

export function tutorLevelOptions(extraLevels: string[] = []) {
  return {
    core: [...TUTOR_CORE_LEVELS],
    more: uniqueSorted([...SEARCH_LEVELS, ...extraLevels]).filter(
      (level) => !TUTOR_CORE_LEVELS.some((core) => core.toLowerCase() === level.toLowerCase()),
    ),
  };
}

/** School-stage chips that must not appear as Qualification stages. */
const LEVEL_ONLY_QUALIFICATION_LABELS = new Set(
  [
    "Primary",
    "Middle / lower secondary",
    "University",
    "Adult learners",
    "Exam prep",
    "Elementary",
    "Middle School",
    "High School",
    "Secondary",
    "KS1",
    "KS2",
    "KS3",
  ].map((label) => label.toLowerCase()),
);

/** Named awards / certificates for Teaching Profile qualification capabilities. */
export const TUTOR_CORE_QUALIFICATIONS = [
  "O Level",
  "IGCSE",
  "International GCSE",
  "GCSE",
  "AS Level",
  "A Level",
  "IB Diploma",
  "AP",
  "Matric",
  "SSC",
  "HSSC",
  "Intermediate",
  "SAT",
  "ACT",
  "HSC",
  "NCEA",
  "SPM",
  "HKDSE",
  "CBSE",
  "ICSE",
  "ISC",
] as const;

export function tutorQualificationOptions(extraQualifications: string[] = []) {
  const exams = curriculumExams().filter(
    (exam) => !LEVEL_ONLY_QUALIFICATION_LABELS.has(exam.toLowerCase()),
  );
  const core = [...TUTOR_CORE_QUALIFICATIONS];
  const more = uniqueSorted([...exams, ...extraQualifications]).filter(
    (exam) =>
      !core.some((item) => item.toLowerCase() === exam.toLowerCase()) &&
      !LEVEL_ONLY_QUALIFICATION_LABELS.has(exam.toLowerCase()),
  );
  return { core, more };
}

export function tutorLanguageOptions() {
  return {
    core: [...TUTOR_CORE_LANGUAGES],
    more: uniqueSorted(EXTRA_LANGUAGES).filter(
      (lang) => !TUTOR_CORE_LANGUAGES.some((core) => core.toLowerCase() === lang.toLowerCase()),
    ),
  };
}

export function expertiseForSubject(subject: string) {
  const exact = EXACT_EXPERTISE[subject];
  if (exact) return exact;
  const matched = SKILL_RULES.filter((rule) => rule.test.test(subject)).flatMap((rule) => rule.skills);
  if (matched.length) return uniqueSorted(matched);
  return ["Core theory", "Exam practice", "Homework support", "Advanced topics"];
}

export function expertiseForSubjects(subjects: string[]) {
  return uniqueSorted(subjects.flatMap((subject) => expertiseForSubject(subject)));
}

export function groupByLetter(names: string[]) {
  const groups = new Map<string, string[]>();
  for (const name of names) {
    const letter = /^[A-Za-z]/.test(name) ? name[0]!.toUpperCase() : "#";
    const list = groups.get(letter) || [];
    list.push(name);
    groups.set(letter, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function countryForKnownCity(city: string) {
  const cityLower = city.trim().toLowerCase();
  if (!cityLower || cityLower === "online") return "";
  for (const row of TOP_COUNTRIES) {
    if (row.cities.some((item) => item.toLowerCase() === cityLower)) return row.name;
    const extra = EXTRA_CITIES[row.name] || [];
    if (extra.some((item) => item.toLowerCase() === cityLower)) return row.name;
  }
  return "";
}

export function formatTutorPlace(location?: string | null, country?: string | null) {
  const city = (location || "").trim();
  const nation = (country || "").trim();
  if (!city && !nation) return "";
  if (city && nation) {
    const cityLower = city.toLowerCase();
    const nationLower = nation.toLowerCase();
    if (cityLower === nationLower) return city;
    if (cityLower.includes(nationLower)) return city;
    // Avoid "Online, Online" style duplication when country is empty-ish and city is Online
    if (cityLower === "online" && (nationLower === "online" || !nation)) return "Online";
    // Prefer city alone when it already looks like "City, Country"
    if (city.includes(",")) return city;
    // Fix mismatches like "Lahore, Germany" when the city is curated under another country
    if (!cityBelongsToCountry(city, nation)) {
      const inferred = countryForKnownCity(city);
      if (inferred) return `${city}, ${inferred}`;
    }
    return `${city}, ${nation}`;
  }
  return city || nation;
}

export function formatTutorAvailability(opts: {
  location?: string | null;
  country?: string | null;
  online?: boolean;
  inPerson?: boolean;
}) {
  const place = formatTutorPlace(opts.location, opts.country);
  const locationIsOnline = (opts.location || "").trim().toLowerCase() === "online";
  const placeIsOnlineOnly = place.toLowerCase() === "online";

  const modes: string[] = [];
  if (opts.inPerson) modes.push("In person");
  if (opts.online && !locationIsOnline && !placeIsOnlineOnly) {
    modes.push("Online");
  }

  if (place && modes.length) return `${place} · ${modes.join(" · ")}`;
  if (place) return place;
  if (modes.length) return modes.join(" · ");
  if (opts.online) return "Online";
  return "";
}
