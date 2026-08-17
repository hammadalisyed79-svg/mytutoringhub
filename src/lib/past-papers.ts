import { CURRICULUM } from "@/lib/curriculum";
import { slugify } from "@/lib/search-tutors";
import { getSiteSettings } from "@/lib/site-settings";

export const PAST_PAPER_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const;
export const PAST_PAPER_TYPES = ["Question paper", "Marking scheme"] as const;

export type PastPaperListing = {
  key: string;
  subject: string;
  board: string;
  year: number;
  paperType: (typeof PAST_PAPER_TYPES)[number];
  title: string;
};

const EXTRA_SUBJECTS = [
  "IELTS",
  "SAT Prep",
  "CSS Prep",
  "Quran Nazra",
  "Spoken English",
  "Urdu",
  "Islamiyat",
  "Pakistan Studies",
];

let pairCache: { board: string; subject: string }[] | null = null;

export function pastPaperPairs() {
  if (pairCache) return pairCache;
  const seen = new Set<string>();
  const out: { board: string; subject: string }[] = [];
  for (const row of CURRICULUM) {
    const id = `${row.board}::${row.subject}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ board: row.board, subject: row.subject });
  }
  for (const subject of EXTRA_SUBJECTS) {
    const board = "Exam prep";
    const id = `${board}::${subject}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ board, subject });
  }
  out.sort((a, b) => a.subject.localeCompare(b.subject) || a.board.localeCompare(b.board));
  pairCache = out;
  return out;
}

export function pastPaperKey(board: string, subject: string, year: number, paperType: string) {
  return [slugify(board), slugify(subject), year, slugify(paperType)].join("__");
}

export function parsePastPaperKey(key: string): PastPaperListing | null {
  const [boardSlug, subjectSlug, yearStr, typeSlug] = key.split("__");
  const year = Number(yearStr);
  const paperType = PAST_PAPER_TYPES.find((type) => slugify(type) === typeSlug);
  const pair = pastPaperPairs().find(
    (row) => slugify(row.board) === boardSlug && slugify(row.subject) === subjectSlug,
  );
  if (!pair || !paperType || !PAST_PAPER_YEARS.includes(year as (typeof PAST_PAPER_YEARS)[number])) {
    return null;
  }
  return {
    key,
    subject: pair.subject,
    board: pair.board,
    year,
    paperType,
    title: `${pair.subject} · ${pair.board} · ${year} ${paperType}`,
  };
}

export function pastPaperCatalog(filters?: {
  subject?: string;
  board?: string;
  year?: number;
  paperType?: string;
  q?: string;
}): PastPaperListing[] {
  const subject = filters?.subject?.trim();
  const board = filters?.board?.trim();
  const year = filters?.year;
  const paperType = filters?.paperType?.trim();
  const q = filters?.q?.trim().toLowerCase();
  const pairs = pastPaperPairs().filter((pair) => {
    if (subject && pair.subject !== subject) return false;
    if (board && pair.board !== board) return false;
    return true;
  });
  const out: PastPaperListing[] = [];
  for (const pair of pairs) {
    for (const y of PAST_PAPER_YEARS) {
      if (year && y !== year) continue;
      for (const type of PAST_PAPER_TYPES) {
        if (paperType && type !== paperType) continue;
        const title = `${pair.subject} · ${pair.board} · ${y} ${type}`;
        if (q && !`${title} ${pair.subject} ${pair.board}`.toLowerCase().includes(q)) continue;
        out.push({
          key: pastPaperKey(pair.board, pair.subject, y, type),
          subject: pair.subject,
          board: pair.board,
          year: y,
          paperType: type,
          title,
        });
      }
    }
  }
  return out;
}

export function pastPaperSubjects() {
  return [...new Set(pastPaperPairs().map((row) => row.subject))].sort((a, b) => a.localeCompare(b));
}

export function pastPaperBoards(subject?: string) {
  const pairs = subject ? pastPaperPairs().filter((row) => row.subject === subject) : pastPaperPairs();
  return [...new Set(pairs.map((row) => row.board))].sort((a, b) => a.localeCompare(b));
}

export function papersForSubjectYear(subject: string, year: number) {
  return pastPaperCatalog({ subject, year });
}

export async function getPastPaperFeePkr() {
  const settings = await getSiteSettings();
  const fee = Number(settings.pastPaperFeePkr);
  return Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : 100;
}

export const DEFAULT_PAST_PAPER_FEE_PKR = 100;
