import { uniqueCurriculumSubjects } from "@/lib/curriculum";
import { allMarketSubjects } from "@/lib/markets";
import { CAMBRIDGE_SYLLABUS_MAP } from "@/lib/past-papers/constants";

/** Extra tutoring subjects seeded alongside curriculum.json and country markets. */
export const EXTRA_SUBJECTS = [
  "Islamiyat",
  "Pakistan Studies",
  "Spanish",
  "Primary School",
  "Music Piano",
  "Guitar",
  "IELTS",
  "CSS Prep",
  "Quran Nazra",
  "SAT Prep",
  "Spoken English",
  "Urdu",
];

const SKIP_R2_SEGMENTS = new Set([
  "cambridge",
  "caie",
  "cie",
  "igcse",
  "gcse",
  "o-level",
  "olevel",
  "o_level",
  "a-level",
  "alevel",
  "a_level",
  "as-level",
  "aslevel",
  "as_level",
  "ol",
  "al",
  "as",
  "a2",
  "past-papers",
  "pastpapers",
  "papers",
  "pdfs",
  "catalog",
  "manifests",
  "manifest",
  "json",
  "uploads",
  "question-paper",
  "mark-scheme",
  "specimen",
]);

export function mergeSubjectNames(...groups: string[][]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const raw of group) {
      const name = raw.trim();
      if (name.length < 2) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function catalogSubjectNames() {
  return mergeSubjectNames(uniqueCurriculumSubjects(), allMarketSubjects(), EXTRA_SUBJECTS);
}

function pushName(out: string[], seen: Set<string>, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(trimmed);
}

export function parseRemoteSubjectsPayload(payload: unknown): string[] {
  let value = payload;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      throw new Error("Cloudflare subjects file is not valid JSON");
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();

  const takeList = (items: unknown[]) => {
    for (const item of items) {
      if (typeof item === "string") {
        pushName(out, seen, item);
        continue;
      }
      if (item && typeof item === "object" && "name" in item) {
        const name = (item as { name?: unknown }).name;
        if (typeof name === "string") pushName(out, seen, name);
      }
    }
  };

  if (Array.isArray(value)) {
    takeList(value);
    return out;
  }

  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const key of ["subjects", "names", "items"]) {
      if (Array.isArray(rec[key])) {
        takeList(rec[key] as unknown[]);
        return out;
      }
    }
  }

  throw new Error('Cloudflare subjects file must be a JSON array or { "subjects": [...] }');
}

function titleCaseSegment(seg: string) {
  return seg
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function subjectNamesFromObjectKey(key: string): string[] {
  const parts = key.replace(/\\/g, "/").split("/").filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of parts) {
    const seg = raw.trim();
    if (!seg || /\./.test(seg)) continue;
    const lower = seg.toLowerCase();
    if (SKIP_R2_SEGMENTS.has(lower)) continue;
    if (/^20\d{2}$/.test(seg)) continue;
    if (/^[smw]\d{2}$/i.test(seg)) continue;
    if (/^\d{4}$/.test(seg)) {
      const mapped = CAMBRIDGE_SYLLABUS_MAP[seg];
      if (mapped) pushName(out, seen, mapped.subject);
      continue;
    }
    pushName(out, seen, titleCaseSegment(seg));
  }

  return out;
}
