/**
 * Repeatable search quality benchmark cases.
 * Ranking principle: academic relevance ≫ boost; boost must never rescue irrelevant.
 */

export type SearchBenchmarkCase = {
  id: string;
  label: string;
  query: {
    subject?: string;
    board?: string;
    level?: string;
    syllabusCode?: string;
    country?: string;
    location?: string;
    mode?: "online" | "in-person";
  };
  expect: {
    kind: "has_results" | "zero_ok" | "city_in_suggestions" | "parse";
    /** For parse cases */
    parsedSubject?: string;
    parsedLocation?: string;
    city?: string;
    country?: string;
    minSuggestionLimit?: number;
  };
};

export const SEARCH_BENCHMARK_CASES: SearchBenchmarkCase[] = [
  {
    id: "subj-math-pk",
    label: "Mathematics in Pakistan (broad)",
    query: { subject: "Mathematics", country: "Pakistan" },
    expect: { kind: "has_results" },
  },
  {
    id: "subj-physics-online",
    label: "Physics online",
    query: { subject: "Physics", mode: "online" },
    expect: { kind: "has_results" },
  },
  {
    id: "exact-0580",
    label: "Syllabus code 0580",
    query: { subject: "Mathematics", syllabusCode: "0580", board: "Cambridge IGCSE" },
    expect: { kind: "has_results" },
  },
  {
    id: "board-aqa-gcse",
    label: "AQA GCSE Chemistry",
    query: { subject: "Chemistry", board: "AQA", level: "GCSE", country: "United Kingdom" },
    expect: { kind: "has_results" },
  },
  {
    id: "city-lahore",
    label: "Lahore city resolve",
    query: { location: "Lahore", country: "Pakistan" },
    expect: { kind: "parse", parsedLocation: "Lahore" },
  },
  {
    id: "city-rawalpindi-suggest",
    label: "Rawalpindi in Pakistan empty suggestions",
    query: { country: "Pakistan" },
    expect: { kind: "city_in_suggestions", city: "Rawalpindi", country: "Pakistan", minSuggestionLimit: 20 },
  },
  {
    id: "zero-nonsense",
    label: "Zero-result nonsense subject",
    query: { subject: "ZxqNotARealSubject999" },
    expect: { kind: "zero_ok" },
  },
  {
    id: "parse-physics-ny",
    label: "Parse Physics New York",
    query: { subject: "Physics", location: "New York" },
    expect: { kind: "parse", parsedSubject: "Physics", parsedLocation: "New York" },
  },
  {
    id: "alias-rwp",
    label: "Alias rwp → Rawalpindi",
    query: { location: "rwp", country: "Pakistan" },
    expect: { kind: "parse", parsedLocation: "Rawalpindi" },
  },
  {
    id: "level-a-level",
    label: "A Level Mathematics",
    query: { subject: "Mathematics", level: "A Level" },
    expect: { kind: "has_results" },
  },
];

/** Boost must stay below a strong subject mismatch penalty conceptually (documented weight check). */
export const SEARCH_RANK_WEIGHTS = {
  subject: 20,
  syllabusCode: 25,
  board: 18,
  level: 12,
  location: 4,
  country: 2,
  boost: 8,
  highlight: 5,
  tier: 3,
  verified: 4,
  trustBadge: 3,
} as const;

export function assertBoostBelowAcademicRelevance() {
  const academic =
    SEARCH_RANK_WEIGHTS.subject +
    SEARCH_RANK_WEIGHTS.syllabusCode +
    SEARCH_RANK_WEIGHTS.board +
    SEARCH_RANK_WEIGHTS.level;
  return SEARCH_RANK_WEIGHTS.boost * 3 < academic;
}
