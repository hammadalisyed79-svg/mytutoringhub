import catalog from "@/data/curriculum.json";

export type CurriculumEntry = {
  country: string;
  board: string;
  level: string;
  subject: string;
  exam: string;
  code: string;
};

export const CURRICULUM = catalog as CurriculumEntry[];

export function curriculumCountries() {
  const names = [...new Set(CURRICULUM.map((row) => row.country))];
  return names.sort((a, b) => {
    if (a === "Pakistan") return -1;
    if (b === "Pakistan") return 1;
    return a.localeCompare(b);
  });
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
