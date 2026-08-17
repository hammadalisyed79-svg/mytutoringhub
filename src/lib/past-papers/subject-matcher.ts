import { CURRICULUM, type CurriculumEntry } from "@/lib/curriculum";
import { prisma } from "@/lib/prisma";
import { CAMBRIDGE_SYLLABUS_MAP } from "./constants";
import type { ScanFilters, SubjectMatch } from "./types";

function norm(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function includesCambridge(board: string) {
  return /cambridge|caie|cie/i.test(board);
}

function scoreEntry(row: CurriculumEntry, filters: ScanFilters, mapped?: { subject: string; level: string }) {
  let score = 0;
  if (row.country === "Pakistan") score += 8;
  if (filters.board && norm(row.board) === norm(filters.board)) score += 12;
  if (filters.qualification && norm(row.level) === norm(filters.qualification)) score += 8;
  if (filters.subject && norm(row.subject) === norm(filters.subject)) score += 10;
  if (filters.subjectCode && row.code.toUpperCase() === filters.subjectCode.trim().toUpperCase()) score += 20;
  if (mapped && norm(row.subject) === norm(mapped.subject)) score += 10;
  if (mapped && norm(row.level) === norm(mapped.level)) score += 8;
  if (mapped && includesCambridge(row.board)) score += 6;
  return score;
}

export function matchCurriculumEntry(
  syllabusOrCode: string | null | undefined,
  filters: ScanFilters = {},
): CurriculumEntry | null {
  const needle = (syllabusOrCode || filters.subjectCode || "").trim();
  if (needle) {
    const exact = CURRICULUM.find((row) => row.code.toUpperCase() === needle.toUpperCase());
    if (exact) return exact;
  }

  const mapped = needle ? CAMBRIDGE_SYLLABUS_MAP[needle] : undefined;
  const candidates = CURRICULUM.filter((row) => {
    if (filters.board && norm(row.board) !== norm(filters.board) && !norm(row.board).includes(norm(filters.board))) {
      if (!(mapped && includesCambridge(row.board) && includesCambridge(filters.board || "cambridge"))) {
        return false;
      }
    }
    if (filters.qualification && norm(row.level) !== norm(filters.qualification)) {
      if (!(mapped && norm(row.level) === norm(mapped.level))) return false;
    }
    if (filters.subject && norm(row.subject) !== norm(filters.subject)) {
      if (!(mapped && norm(row.subject) === norm(mapped.subject))) return false;
    }
    if (mapped) {
      return (
        includesCambridge(row.board) &&
        norm(row.subject) === norm(mapped.subject) &&
        (norm(row.level) === norm(mapped.level) ||
          (mapped.level === "A Level" && /a\s*level|as\s*level/i.test(row.level)))
      );
    }
    if (needle) return false;
    return Boolean(filters.subject || filters.board);
  });

  if (!candidates.length) {
    if (filters.subject) {
      const byName = CURRICULUM.filter((row) => norm(row.subject) === norm(filters.subject));
      if (byName.length === 1) return byName[0];
      const pk = byName.find((row) => row.country === "Pakistan");
      if (pk) return pk;
    }
    return null;
  }

  return [...candidates].sort((a, b) => scoreEntry(b, filters, mapped) - scoreEntry(a, filters, mapped))[0];
}

export async function matchPastPaperSubject(opts: {
  syllabusCode?: string | null;
  curriculumCode?: string | null;
  filters?: ScanFilters;
}): Promise<SubjectMatch> {
  const filters = opts.filters || {};
  const code = opts.curriculumCode || opts.syllabusCode || filters.subjectCode || "";
  const entry = matchCurriculumEntry(code, {
    ...filters,
    subjectCode: opts.curriculumCode || filters.subjectCode,
  });
  const notes: string[] = [];
  if (!entry) {
    notes.push("No curriculum.json row matched this code/board/subject.");
    return {
      status: "UNMATCHED_SUBJECT",
      entry: null,
      subjectId: null,
      syllabusCode: opts.syllabusCode || null,
      notes,
    };
  }

  let subjectId: string | null = null;
  try {
    const subject = await prisma.subject.findFirst({
      where: { name: { equals: entry.subject, mode: "insensitive" } },
      select: { id: true },
    });
    subjectId = subject?.id || null;
  } catch {
    subjectId = null;
  }

  return {
    status: "MATCHED",
    entry,
    subjectId,
    syllabusCode: opts.syllabusCode || (CAMBRIDGE_SYLLABUS_MAP[code] ? code : null),
    notes,
  };
}
