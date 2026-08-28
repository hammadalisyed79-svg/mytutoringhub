import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicAvailabilityWhere } from "./availability";
import { PAST_PAPER_PAGE_SIZE } from "./browse";

export type PublicPaperFilters = {
  subject?: string;
  board?: string;
  qualification?: string;
  country?: string;
  year?: number;
  session?: string;
  q?: string;
  code?: string;
  paper?: string;
  documentType?: string;
};

/** Cambridge-style syllabus codes are stored as 4 digits (e.g. 0620). */
export function normalizeSyllabusCode(raw: string) {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (/^\d{3,4}$/.test(digits)) return digits.padStart(4, "0");
  return trimmed;
}

/**
 * Parse free-text search into structured filters.
 * Supports "0620", "9701 qp 42", "paper 12", and subject keywords.
 */
export function parsePastPaperQuery(input: string): Partial<PublicPaperFilters> {
  const text = input.trim();
  if (!text) return {};

  if (/^\d{3,4}$/.test(text)) {
    return { code: normalizeSyllabusCode(text) };
  }

  const codePaper = text.match(/^(\d{3,4})\s+(?:qp|ms|paper|p)?\s*(\d{1,2})$/i);
  if (codePaper) {
    return {
      code: normalizeSyllabusCode(codePaper[1]),
      paper: codePaper[2],
    };
  }

  const paperOnly = text.match(/^(?:paper|qp|p)\s*(\d{1,2})$/i);
  if (paperOnly) {
    return { paper: paperOnly[1] };
  }

  return { q: text };
}

export function mergePublicPaperFilters(
  raw: PublicPaperFilters,
  parsedFromQ?: Partial<PublicPaperFilters>,
): PublicPaperFilters {
  const code = raw.code?.trim() || parsedFromQ?.code;
  const paper = raw.paper?.trim() || parsedFromQ?.paper;
  const q = parsedFromQ?.q ?? (raw.q?.trim() && !parsedFromQ?.code && !parsedFromQ?.paper ? raw.q.trim() : undefined);

  return {
    ...raw,
    q,
    code: code ? normalizeSyllabusCode(code) : undefined,
    paper: paper || undefined,
  };
}

export function hasPublicPaperSearchFilters(filters: PublicPaperFilters) {
  return Boolean(
    filters.q?.trim() ||
      filters.code?.trim() ||
      filters.paper?.trim() ||
      filters.documentType ||
      filters.session ||
      (filters.board && !filters.country) ||
      (filters.country && filters.board && filters.subject),
  );
}

export function publicPaperWhere(filters: PublicPaperFilters): Prisma.PastPaperWhereInput {
  const AND: Prisma.PastPaperWhereInput[] = [publicAvailabilityWhere()];
  if (filters.subject) AND.push({ subject: { equals: filters.subject, mode: "insensitive" } });
  if (filters.board) AND.push({ board: { contains: filters.board, mode: "insensitive" } });
  if (filters.qualification) {
    AND.push({ qualification: { equals: filters.qualification, mode: "insensitive" } });
  }
  if (filters.country) AND.push({ country: { equals: filters.country, mode: "insensitive" } });
  if (filters.year) AND.push({ year: filters.year });
  if (filters.session) AND.push({ session: filters.session });
  if (filters.documentType) AND.push({ documentType: filters.documentType });
  if (filters.code) {
    const code = normalizeSyllabusCode(filters.code);
    AND.push({
      OR: [
        { syllabusCode: { equals: code, mode: "insensitive" } },
        { syllabusCode: { contains: code, mode: "insensitive" } },
        { curriculumCode: { equals: code, mode: "insensitive" } },
        { curriculumCode: { contains: code, mode: "insensitive" } },
      ],
    });
  }
  if (filters.paper) {
    const paper = filters.paper.trim();
    AND.push({
      OR: [
        { componentCode: { equals: paper, mode: "insensitive" } },
        { componentCode: { contains: paper, mode: "insensitive" } },
        { paperNumber: { equals: paper, mode: "insensitive" } },
        { paperNumber: { contains: paper, mode: "insensitive" } },
      ],
    });
  }
  if (filters.q) {
    const q = filters.q.trim();
    const normalizedCode = /^\d{3,4}$/.test(q) ? normalizeSyllabusCode(q) : null;
    AND.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { board: { contains: q, mode: "insensitive" } },
        { syllabusCode: { contains: q, mode: "insensitive" } },
        { curriculumCode: { contains: q, mode: "insensitive" } },
        { componentCode: { contains: q, mode: "insensitive" } },
        { paperNumber: { contains: q, mode: "insensitive" } },
        ...(normalizedCode
          ? [
              { syllabusCode: { equals: normalizedCode, mode: "insensitive" as const } },
              { curriculumCode: { contains: normalizedCode, mode: "insensitive" as const } },
            ]
          : []),
      ],
    });
  }
  return { AND };
}

export async function searchPublicPastPapers(filters: PublicPaperFilters, page = 1) {
  const where = publicPaperWhere(filters);
  const skip = Math.max(0, (page - 1) * PAST_PAPER_PAGE_SIZE);
  const [total, papers] = await Promise.all([
    prisma.pastPaper.count({ where }),
    prisma.pastPaper.findMany({
      where,
      orderBy: [{ year: "desc" }, { session: "asc" }, { componentCode: "asc" }, { documentType: "asc" }],
      skip,
      take: PAST_PAPER_PAGE_SIZE,
    }),
  ]);
  return { total, papers, page, pageSize: PAST_PAPER_PAGE_SIZE };
}

export async function listPublicPastPapers(filters: PublicPaperFilters, take = 2000) {
  return prisma.pastPaper.findMany({
    where: publicPaperWhere(filters),
    orderBy: [{ year: "desc" }, { session: "asc" }, { componentCode: "asc" }, { documentType: "asc" }],
    take,
  });
}
