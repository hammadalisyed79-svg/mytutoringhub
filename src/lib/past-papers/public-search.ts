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
    const code = filters.code.trim();
    AND.push({
      OR: [
        { syllabusCode: { equals: code, mode: "insensitive" } },
        { curriculumCode: { equals: code, mode: "insensitive" } },
      ],
    });
  }
  if (filters.paper) {
    AND.push({
      OR: [
        { componentCode: { contains: filters.paper, mode: "insensitive" } },
        { paperNumber: { contains: filters.paper, mode: "insensitive" } },
      ],
    });
  }
  if (filters.q) {
    const q = filters.q.trim();
    AND.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { board: { contains: q, mode: "insensitive" } },
        { syllabusCode: { contains: q, mode: "insensitive" } },
        { curriculumCode: { contains: q, mode: "insensitive" } },
        { componentCode: { contains: q, mode: "insensitive" } },
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
