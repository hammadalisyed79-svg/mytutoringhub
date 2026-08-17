import { DOCUMENT_TYPE_LABELS } from "./constants";
import { sanitizeStoredSegment } from "./file-validate";

export function buildStoredFilename(opts: {
  board: string;
  qualification?: string | null;
  subject: string;
  syllabusCode?: string | null;
  year: number;
  session?: string | null;
  componentCode?: string | null;
  documentType?: string | null;
}) {
  const parts = [
    opts.board,
    opts.qualification,
    opts.subject,
    opts.syllabusCode,
    String(opts.year),
    opts.session,
    opts.componentCode ? `paper-${opts.componentCode}` : null,
    DOCUMENT_TYPE_LABELS[opts.documentType || ""] || opts.documentType || "paper",
  ]
    .filter(Boolean)
    .map((part) => sanitizeStoredSegment(String(part)))
    .filter(Boolean);
  const name = parts.join("-") || "past-paper";
  return `${name}.pdf`;
}

export function documentTypeLabel(documentType?: string | null) {
  if (!documentType) return "Paper";
  return DOCUMENT_TYPE_LABELS[documentType] || documentType.replace(/_/g, " ").toLowerCase();
}
