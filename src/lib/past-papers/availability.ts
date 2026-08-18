import { Prisma } from "@prisma/client";

export function paperHasFile(paper: { fileUrl?: string | null; storageKey?: string | null }) {
  return Boolean(paper.storageKey || paper.fileUrl);
}

export function downloadableFileWhere(): Prisma.PastPaperWhereInput {
  return {
    OR: [{ storageKey: { not: null } }, { fileUrl: { not: null } }],
  };
}

export function publicAvailabilityWhere(): Prisma.PastPaperWhereInput {
  return {
    published: true,
    isActive: true,
    ...downloadableFileWhere(),
  };
}

export function isR2Paper(paper: {
  storageProvider?: string | null;
  fileUrl?: string | null;
  storageKey?: string | null;
}) {
  if ((paper.storageProvider || "").toUpperCase() === "R2") return Boolean(paper.storageKey);
  return Boolean(paper.storageKey && !paper.fileUrl);
}
