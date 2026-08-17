import { slugify } from "@/lib/search-tutors";
import { documentTypeLabel } from "./stored-filename";

export function isSafeCatalogKey(key: string) {
  return /^[a-z0-9_-]+$/i.test(key) && key.length >= 4 && key.length <= 220 && !key.includes("..");
}

export function importedCatalogKey(opts: {
  board: string;
  subject: string;
  year: number;
  documentType?: string | null;
  paperType?: string | null;
  session?: string | null;
  componentCode?: string | null;
}) {
  const paperType = opts.paperType || documentTypeLabel(opts.documentType);
  const parts = [slugify(opts.board), slugify(opts.subject), String(opts.year), slugify(paperType)];
  if (opts.session || opts.componentCode) {
    parts.push(slugify(opts.session || "na"), slugify(opts.componentCode || "na"));
  }
  return parts.join("__");
}

export function duplicateComboWhere(opts: {
  curriculumCode?: string | null;
  syllabusCode?: string | null;
  year: number;
  session?: string | null;
  componentCode?: string | null;
  documentType?: string | null;
}) {
  const code = opts.curriculumCode || opts.syllabusCode;
  if (!code || !opts.session || !opts.componentCode || !opts.documentType) return null;
  return {
    year: opts.year,
    session: opts.session,
    componentCode: opts.componentCode,
    documentType: opts.documentType,
    OR: [{ curriculumCode: code }, { syllabusCode: code }],
  };
}
