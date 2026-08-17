import type { CurriculumEntry } from "@/lib/curriculum";

export const PAST_PAPER_DOCUMENT_TYPES = [
  "QUESTION_PAPER",
  "MARK_SCHEME",
  "EXAMINER_REPORT",
  "INSERT",
  "SOURCE_BOOKLET",
  "FORMULA_SHEET",
  "LISTENING_AUDIO",
  "TRANSCRIPT",
  "SPECIMEN_PAPER",
  "SPECIMEN_MARK_SCHEME",
  "OTHER",
] as const;

export type PastPaperDocumentType = (typeof PAST_PAPER_DOCUMENT_TYPES)[number];

export const IMPORT_ITEM_STATUSES = [
  "NEW",
  "ALREADY_EXISTS",
  "INVALID",
  "UNMATCHED_SUBJECT",
  "REQUIRES_REVIEW",
  "UNAVAILABLE",
  "IMPORTED",
  "FAILED",
  "REPLACED",
] as const;

export type ImportItemStatus = (typeof IMPORT_ITEM_STATUSES)[number];

export const IMPORT_JOB_STATUSES = [
  "PENDING",
  "SCANNING",
  "READY",
  "IMPORTING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const PAST_PAPER_SOURCES = [
  "MANUAL_UPLOAD",
  "URL_LIST",
  "CAMBRIDGE",
  "AQA",
  "PEARSON",
  "CBSE",
  "FBISE",
] as const;

export type PastPaperSourceId = (typeof PAST_PAPER_SOURCES)[number];

export const CAMBRIDGE_SESSIONS = {
  m: { code: "m", label: "Feb/Mar", slug: "feb-mar" },
  s: { code: "s", label: "May/Jun", slug: "may-june" },
  w: { code: "w", label: "Oct/Nov", slug: "oct-nov" },
} as const;

export type CambridgeSessionCode = keyof typeof CAMBRIDGE_SESSIONS;

export type ParsedPaperMetadata = {
  syllabusCode: string;
  sessionCode: CambridgeSessionCode;
  sessionLabel: string;
  year: number;
  typeCode: string;
  documentType: PastPaperDocumentType;
  componentCode: string;
  paperNumber: string;
  variant: string | null;
  originalFilename: string;
  confidence: "ok" | "review";
  notes: string[];
};

export type ParseMetadataResult =
  | { ok: true; metadata: ParsedPaperMetadata }
  | { ok: false; status: "REQUIRES_REVIEW" | "INVALID"; error: string; originalFilename: string };

export type SubjectMatch = {
  status: "MATCHED" | "UNMATCHED_SUBJECT";
  entry: CurriculumEntry | null;
  subjectId: string | null;
  syllabusCode: string | null;
  notes: string[];
};

export type ScanFilters = {
  board?: string;
  qualification?: string;
  subject?: string;
  subjectCode?: string;
  yearFrom?: number;
  yearTo?: number;
  session?: string;
  documentType?: string;
};

export type AvailableFileRef = {
  filename: string;
  sourceUrl?: string;
  bytes?: Uint8Array;
  mimeType?: string;
  size?: number;
};

export type ValidatedFile = {
  ok: true;
  buffer: Buffer;
  mimeType: string;
  size: number;
  checksum: string;
  originalFilename: string;
};

export type FileValidationFailure = {
  ok: false;
  error: string;
  status: "INVALID";
  originalFilename: string;
};

export type DownloadedFile = ValidatedFile | FileValidationFailure;

export type SourceAdapter = {
  id: PastPaperSourceId;
  label: string;
  enabled: boolean;
  scanSubject: (filters: ScanFilters) => Promise<AvailableFileRef[]>;
  getAvailableFiles: (filters: ScanFilters) => Promise<AvailableFileRef[]>;
  parseMetadata: (filename: string) => ParseMetadataResult;
  downloadFile: (ref: AvailableFileRef) => Promise<DownloadedFile>;
  validateFile: (buffer: Buffer, filename: string, mimeType?: string) => DownloadedFile;
};
