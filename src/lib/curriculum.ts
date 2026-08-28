import catalog from "@/data/curriculum.json";
import { FEATURED_COUNTRY_LIMIT, HOMEPAGE_FEATURED_COUNTRY_CODES, countryByCode } from "@/lib/markets";

export type CurriculumEntry = {
  country: string;
  board: string;
  level: string;
  subject: string;
  exam: string;
  code: string;
};

export const CURRICULUM = catalog as CurriculumEntry[];

export function curriculumCountries(pinnedFirst?: string | null) {
  const fromCurriculum = new Set(CURRICULUM.map((row) => row.country));
  const names = [...fromCurriculum].sort((a, b) => {
    if (pinnedFirst) {
      if (a === pinnedFirst) return -1;
      if (b === pinnedFirst) return 1;
    }
    if (a === "Pakistan") return -1;
    if (b === "Pakistan") return 1;
    return a.localeCompare(b);
  });
  return names;
}

/** Eight featured curriculum countries as pills; the rest go in a dropdown. */
export function splitCurriculumCountries(pinnedFirst?: string | null): {
  featured: string[];
  rest: string[];
} {
  const all = curriculumCountries();
  const allSet = new Set(all);
  const featured: string[] = [];
  for (const code of HOMEPAGE_FEATURED_COUNTRY_CODES) {
    const name = countryByCode(code)?.name;
    if (!name || !allSet.has(name) || featured.includes(name)) continue;
    featured.push(name);
    if (featured.length === FEATURED_COUNTRY_LIMIT) break;
  }
  for (const name of all) {
    if (featured.length === FEATURED_COUNTRY_LIMIT) break;
    if (!featured.includes(name)) featured.push(name);
  }

  if (pinnedFirst && allSet.has(pinnedFirst)) {
    if (featured.includes(pinnedFirst)) {
      featured.splice(0, featured.length, pinnedFirst, ...featured.filter((n) => n !== pinnedFirst));
    } else {
      featured.splice(0, featured.length, pinnedFirst, ...featured.slice(0, FEATURED_COUNTRY_LIMIT - 1));
    }
  }

  const featuredSet = new Set(featured.slice(0, FEATURED_COUNTRY_LIMIT));
  const rest = all.filter((name) => !featuredSet.has(name));
  return { featured: featured.slice(0, FEATURED_COUNTRY_LIMIT), rest };
}

export function uniqueCurriculumSubjects() {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of CURRICULUM) {
    if (seen.has(row.subject)) continue;
    seen.add(row.subject);
    out.push(row.subject);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function uniqueSubjectsForCountry(country: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of CURRICULUM) {
    if (row.country !== country || seen.has(row.subject)) continue;
    seen.add(row.subject);
    out.push(row.subject);
  }
  return out;
}

export function curriculumForCountry(country: string) {
  return CURRICULUM.filter((row) => row.country === country);
}

export type CurriculumBoardGroup = {
  board: string;
  entries: CurriculumEntry[];
};

export function groupCurriculumByBoard(
  country: string,
  query = "",
): CurriculumBoardGroup[] {
  const needle = query.trim().toLowerCase();
  const groups = new Map<string, CurriculumEntry[]>();
  for (const row of curriculumForCountry(country)) {
    if (needle) {
      const hay = `${row.code} ${row.subject} ${row.board} ${row.level} ${row.exam}`.toLowerCase();
      if (!hay.includes(needle)) continue;
    }
    const list = groups.get(row.board) || [];
    list.push(row);
    groups.set(row.board, list);
  }
  return [...groups.entries()]
    .map(([board, entries]) => ({
      board,
      entries: entries.sort((a, b) => a.subject.localeCompare(b.subject) || a.level.localeCompare(b.level)),
    }))
    .sort((a, b) => a.board.localeCompare(b.board));
}

export function curriculumLevels() {
  return [...new Set(CURRICULUM.map((row) => row.level))].sort((a, b) => a.localeCompare(b));
}

export type CurriculumCodeOption = {
  code: string;
  subject: string;
  level: string;
  board: string;
};

export function curriculumCodeOptions(): CurriculumCodeOption[] {
  return CURRICULUM.map((row) => ({
    code: row.code,
    subject: row.subject,
    level: row.level,
    board: row.board,
  }));
}

export function matchCurriculumCode(query: string) {
  const needle = query.trim().toUpperCase();
  if (!needle || needle.length < 4) return null;
  const exact = CURRICULUM.find((row) => row.code.toUpperCase() === needle);
  if (exact) return exact;
  const prefix = CURRICULUM.filter((row) => row.code.toUpperCase().startsWith(needle));
  return prefix.length === 1 ? prefix[0] : null;
}

/** Distinct exam boards for Teaching Listing forms (optional taxonomy). */
export function curriculumBoards(): string[] {
  return [...new Set(CURRICULUM.map((row) => row.board))].sort((a, b) => a.localeCompare(b));
}

/** Levels / qualifications that appear under a board (or all if board empty). */
export function curriculumLevelsForBoard(board?: string | null): string[] {
  const rows = board
    ? CURRICULUM.filter((row) => row.board.toLowerCase() === board.trim().toLowerCase())
    : CURRICULUM;
  return [...new Set(rows.map((row) => row.level))].sort((a, b) => a.localeCompare(b));
}

/** Syllabus codes for subject (+ optional board). */
export function curriculumCodesForSubject(
  subject?: string | null,
  board?: string | null,
): CurriculumCodeOption[] {
  const sub = (subject || "").trim().toLowerCase();
  const brd = (board || "").trim().toLowerCase();
  return curriculumCodeOptions().filter((row) => {
    if (sub && !row.subject.toLowerCase().includes(sub) && !sub.includes(row.subject.toLowerCase())) {
      return false;
    }
    if (brd && row.board.toLowerCase() !== brd) return false;
    return Boolean(row.code);
  });
}
