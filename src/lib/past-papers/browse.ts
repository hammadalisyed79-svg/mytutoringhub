import { CURRICULUM } from "@/lib/curriculum";
import { slugify } from "@/lib/search-tutors";
import { CAMBRIDGE_SYLLABUS_MAP } from "./constants";

export function curriculumBoardsForCountry(country: string) {
  return [...new Set(CURRICULUM.filter((row) => row.country === country).map((row) => row.board))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function curriculumLevelsForBoard(country: string, board: string) {
  return [
    ...new Set(
      CURRICULUM.filter((row) => row.country === country && row.board === board).map((row) => row.level),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function curriculumSubjectsFor(country: string, board: string, level: string) {
  return CURRICULUM.filter(
    (row) => row.country === country && row.board === board && row.level === level,
  ).sort((a, b) => a.subject.localeCompare(b.subject));
}

export function uniqueCurriculumBoards() {
  return [...new Set(CURRICULUM.map((row) => row.board))].sort((a, b) => a.localeCompare(b));
}

export function uniqueCurriculumLevels(board?: string) {
  const rows = board ? CURRICULUM.filter((row) => row.board === board) : CURRICULUM;
  return [...new Set(rows.map((row) => row.level))].sort((a, b) => a.localeCompare(b));
}

export function uniqueCurriculumSubjects(board?: string, level?: string) {
  const rows = CURRICULUM.filter((row) => {
    if (board && row.board !== board) return false;
    if (level && row.level !== level) return false;
    return true;
  });
  return [...new Set(rows.map((row) => row.subject))].sort((a, b) => a.localeCompare(b));
}

export function seoBoardSlug(board: string) {
  if (/cambridge/i.test(board)) return "cambridge";
  return slugify(board);
}

export function subjectSeoSlug(
  entry: { subject: string; code?: string; level?: string },
  syllabusCode?: string | null,
) {
  const code = syllabusCode || guessSyllabusCode(entry.subject, entry.level) || "";
  const base = slugify(entry.subject);
  return code ? `${base}-${code.toLowerCase()}` : base;
}

export function guessSyllabusCode(subject: string, level?: string) {
  const subjectName = subject.trim().toLowerCase();
  const levelName = (level || "").trim().toLowerCase();
  const entries = Object.entries(CAMBRIDGE_SYLLABUS_MAP).filter(
    ([, meta]) => meta.subject.toLowerCase() === subjectName,
  );
  if (!entries.length) return null;
  if (levelName) {
    const exact = entries.find(([, meta]) => meta.level.toLowerCase() === levelName);
    if (exact) return exact[0];
    if (levelName.includes("igcse")) {
      const igcse = entries.find(([, meta]) => meta.level === "IGCSE");
      if (igcse) return igcse[0];
    }
    if (/o\s*level/.test(levelName)) {
      const olevel = entries.find(([, meta]) => meta.level === "O Level");
      if (olevel) return olevel[0];
    }
    if (/a\s*level|as\s*level/.test(levelName)) {
      const alevel = entries.find(([, meta]) => meta.level === "A Level");
      if (alevel) return alevel[0];
    }
  }
  return (entries.find(([, meta]) => meta.level === "IGCSE") || entries[0])[0];
}

export function parseSubjectSeoSlug(slug: string) {
  const decoded = decodeURIComponent(slug);
  const match = decoded.match(/^(.*)-([0-9]{4})$/);
  if (match) {
    return { subjectSlug: match[1], syllabusCode: match[2] };
  }
  return { subjectSlug: decoded, syllabusCode: null as string | null };
}

export function resolveSeoCurriculum(boardSlug: string, qualificationSlug: string, subjectSlug: string) {
  const parsed = parseSubjectSeoSlug(subjectSlug);
  const mapped = parsed.syllabusCode ? CAMBRIDGE_SYLLABUS_MAP[parsed.syllabusCode] : undefined;
  const rows = CURRICULUM.filter((row) => {
    const boardOk =
      slugify(row.board) === boardSlug ||
      (boardSlug === "cambridge" && /cambridge/i.test(row.board));
    const levelOk = slugify(row.level) === qualificationSlug;
    if (!boardOk || !levelOk) return false;
    if (mapped) return row.subject.toLowerCase() === mapped.subject.toLowerCase();
    return slugify(row.subject) === parsed.subjectSlug || slugify(row.subject) === slugify(subjectSlug);
  });
  const preferred =
    rows.find((row) => row.country === "Pakistan") ||
    rows[0] ||
    null;
  return {
    entry: preferred,
    rows,
    syllabusCode: parsed.syllabusCode,
  };
}

export const PAST_PAPER_PAGE_SIZE = 24;
