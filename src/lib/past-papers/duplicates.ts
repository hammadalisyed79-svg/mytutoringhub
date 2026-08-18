import { prisma } from "@/lib/prisma";
import { duplicateComboWhere } from "./catalog-key";

export async function findDuplicatePaper(opts: {
  checksum?: string | null;
  curriculumCode?: string | null;
  syllabusCode?: string | null;
  year?: number | null;
  session?: string | null;
  componentCode?: string | null;
  documentType?: string | null;
  catalogKey?: string | null;
  storageKey?: string | null;
}) {
  if (opts.checksum) {
    const byChecksum = await prisma.pastPaper.findFirst({ where: { checksum: opts.checksum } });
    if (byChecksum) return { paper: byChecksum, reason: "checksum" as const };
  }
  if (opts.catalogKey) {
    const byKey = await prisma.pastPaper.findUnique({ where: { catalogKey: opts.catalogKey } });
    if (byKey) return { paper: byKey, reason: "catalogKey" as const };
  }
  if (opts.storageKey) {
    const byStorage = await prisma.pastPaper.findFirst({ where: { storageKey: opts.storageKey } });
    if (byStorage) return { paper: byStorage, reason: "storageKey" as const };
  }
  if (opts.year) {
    const combo = duplicateComboWhere({
      curriculumCode: opts.curriculumCode,
      syllabusCode: opts.syllabusCode,
      year: opts.year,
      session: opts.session,
      componentCode: opts.componentCode,
      documentType: opts.documentType,
    });
    if (combo) {
      const byCombo = await prisma.pastPaper.findFirst({ where: combo });
      if (byCombo) return { paper: byCombo, reason: "combo" as const };
    }
  }
  return null;
}
