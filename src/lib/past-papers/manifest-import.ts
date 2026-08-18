import { prisma } from "@/lib/prisma";
import { importedCatalogKey } from "./catalog-key";
import {
  DEFAULT_R2_PREFIX,
  PHASE1_SYLLABUS_CODE,
  PHASE1_YEAR_FROM,
  PHASE1_YEAR_TO,
  R2_MANIFEST_SOURCE,
} from "./constants";
import { findDuplicatePaper } from "./duplicates";
import { basenameSafe } from "./file-validate";
import { pastPaperVisibility } from "./import-service";
import { getObjectUtf8, headObject, isR2Configured, listObjectSummaries, r2NotConfiguredMessage } from "./r2";
import { buildStoredFilename, documentTypeLabel } from "./stored-filename";
import { matchPastPaperSubject } from "./subject-matcher";
import { normalizeCambridgeSession, parseCambridgeFilename } from "./cambridge-filename-parser";
import type { ImportItemStatus, ImportJobStatus } from "./types";

export type ManifestEntry = {
  originalFilename: string;
  storageKey: string;
  fileSize: number | null;
  checksum: string | null;
  parsed?: Record<string, unknown> | null;
};

const CHECKSUM_RE = /^[a-f0-9]{64}$/i;
const PHASE1_PREFIXES = [
  DEFAULT_R2_PREFIX,
  "cambridge/igcse/chemistry/0620",
  "cambridge/igcse/0620",
  "0620/",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(str(value));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function checksumOf(value: unknown) {
  const raw = str(value);
  return CHECKSUM_RE.test(raw) ? raw.toLowerCase() : null;
}

function pickArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const rec = asRecord(payload);
  if (!rec) return [];
  for (const key of ["files", "items", "objects", "papers"]) {
    if (Array.isArray(rec[key])) return rec[key] as unknown[];
  }
  return [];
}

function entryFromUnknown(row: unknown): ManifestEntry | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const storageKey = str(
    rec.r2_object_key || rec.r2Key || rec.r2_key || rec.storageKey || rec.objectKey || rec.key,
  );
  const originalFilename = basenameSafe(
    str(rec.original_filename || rec.originalFilename || rec.filename || rec.name) || storageKey,
  );
  if (!storageKey && !originalFilename) return null;
  if (originalFilename && !originalFilename.toLowerCase().endsWith(".pdf")) return null;
  if (storageKey && !storageKey.toLowerCase().endsWith(".pdf") && !storageKey.toLowerCase().endsWith(".json")) {
    return null;
  }
  const status = str(rec.upload_status || rec.status).toLowerCase();
  if (status && ["failed", "error", "skipped"].includes(status)) return null;
  return {
    originalFilename: originalFilename || basenameSafe(storageKey),
    storageKey,
    fileSize: num(rec.file_size ?? rec.fileSize ?? rec.size ?? rec.bytes),
    checksum: checksumOf(rec.checksum || rec.sha256 || rec.hash),
    parsed: asRecord(rec.parsed),
  };
}

export function parseManifestPayload(payload: unknown): ManifestEntry[] {
  const seen = new Set<string>();
  const out: ManifestEntry[] = [];
  for (const row of pickArray(payload)) {
    const entry = entryFromUnknown(row);
    if (!entry) continue;
    const id = entry.storageKey || entry.originalFilename;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(entry);
  }
  return out;
}

function syllabusFromParsed(parsed?: Record<string, unknown> | null) {
  return str(parsed?.subject_code || parsed?.syllabusCode || parsed?.code);
}

function inPhase1Window(syllabusCode: string | null, year: number | null) {
  if ((syllabusCode || "") !== PHASE1_SYLLABUS_CODE) return false;
  if (!year || year < PHASE1_YEAR_FROM || year > PHASE1_YEAR_TO) return false;
  return true;
}

function countByStatus(items: { status: string }[]) {
  const newCount = items.filter((row) => row.status === "NEW").length;
  const existsCount = items.filter((row) => row.status === "ALREADY_EXISTS").length;
  const importedCount = items.filter((row) => row.status === "IMPORTED" || row.status === "REPLACED").length;
  const failedCount = items.filter((row) => ["INVALID", "FAILED", "UNAVAILABLE"].includes(row.status)).length;
  const skippedCount = items.filter((row) =>
    ["UNMATCHED_SUBJECT", "REQUIRES_REVIEW"].includes(row.status),
  ).length;
  return { newCount, existsCount, importedCount, failedCount, skippedCount, totalItems: items.length };
}

function jobStatusFromItems(items: { status: string }[]): ImportJobStatus {
  if (!items.length) return "READY";
  const imported = items.some((row) => row.status === "IMPORTED" || row.status === "REPLACED");
  const pending = items.some((row) =>
    ["NEW", "ALREADY_EXISTS", "UNMATCHED_SUBJECT", "REQUIRES_REVIEW"].includes(row.status),
  );
  const failed = items.some((row) => ["FAILED", "INVALID", "UNAVAILABLE"].includes(row.status));
  if (imported && (pending || failed)) return "PARTIAL";
  if (imported && !pending) return "COMPLETED";
  if (failed && !pending && !imported) return "FAILED";
  return "READY";
}

type ClassifiedManifestItem = {
  originalFilename: string;
  storageKey: string;
  status: ImportItemStatus;
  error: string | null;
  checksum: string | null;
  fileSize: number | null;
  year: number | null;
  session: string | null;
  subject: string | null;
  board: string | null;
  qualification: string | null;
  country: string | null;
  curriculumCode: string | null;
  syllabusCode: string | null;
  componentCode: string | null;
  paperNumber: string | null;
  variant: string | null;
  documentType: string | null;
  catalogKey: string | null;
  storedFilename: string | null;
  subjectId: string | null;
};

async function classifyManifestEntry(entry: ManifestEntry): Promise<ClassifiedManifestItem> {
  const originalFilename = basenameSafe(entry.originalFilename || entry.storageKey);
  const parsedFile = parseCambridgeFilename(originalFilename);
  const parsedPath = entry.storageKey ? parseCambridgeFilename(entry.storageKey) : parsedFile;
  const parsed = parsedFile.ok ? parsedFile : parsedPath;
  const meta = entry.parsed;

  let status: ImportItemStatus = "NEW";
  let error: string | null = null;
  const year = parsed.ok ? parsed.metadata.year : num(meta?.year);
  const session = parsed.ok
    ? parsed.metadata.sessionLabel
    : normalizeCambridgeSession(str(meta?.session || meta?.sessionLabel));
  const documentType: string | null = parsed.ok
    ? parsed.metadata.documentType
    : str(meta?.document_type || meta?.documentType) || null;
  const syllabusCode = parsed.ok
    ? parsed.metadata.syllabusCode
    : syllabusFromParsed(meta) || (originalFilename.match(/^(\d{4})_/)?.[1] ?? null);
  const componentCode = parsed.ok
    ? parsed.metadata.componentCode || null
    : str(meta?.component || meta?.componentCode) || null;
  const paperNumber = parsed.ok
    ? parsed.metadata.paperNumber || null
    : str(meta?.paper) || (componentCode && /^\d/.test(componentCode) ? componentCode[0] : null);
  const variant = parsed.ok
    ? parsed.metadata.variant
    : str(meta?.variant) || (/^\d{2}$/.test(componentCode || "") ? (componentCode as string)[1] : null);

  if (!parsed.ok && !syllabusCode) {
    status = parsedFile.ok === false ? parsedFile.status : "REQUIRES_REVIEW";
    error = parsedFile.ok === false ? parsedFile.error : "Could not parse Cambridge filename";
  } else if (!parsed.ok) {
    status = "REQUIRES_REVIEW";
    error = parsedFile.ok === false ? parsedFile.error : "Used importer metadata; filename needs review";
  } else if (parsed.metadata.confidence === "review") {
    status = "REQUIRES_REVIEW";
    error = parsed.metadata.notes.join("; ") || "Needs review";
  }

  if (syllabusCode && syllabusCode !== PHASE1_SYLLABUS_CODE) {
    status = "INVALID";
    error = `Phase 1 ingest is Chemistry ${PHASE1_SYLLABUS_CODE} only`;
  } else if (year && (year < PHASE1_YEAR_FROM || year > PHASE1_YEAR_TO)) {
    status = "REQUIRES_REVIEW";
    error = `Year ${year} is outside ${PHASE1_YEAR_FROM}–${PHASE1_YEAR_TO}`;
  } else if (!inPhase1Window(syllabusCode, year) && status === "NEW") {
    status = "INVALID";
    error = `Not a ${PHASE1_SYLLABUS_CODE} paper from ${PHASE1_YEAR_FROM}–${PHASE1_YEAR_TO}`;
  }

  if (!entry.storageKey && status === "NEW") {
    status = "INVALID";
    error = "Missing R2 object key";
  }

  const match =
    status === "INVALID"
      ? { status: "UNMATCHED_SUBJECT" as const, entry: null, subjectId: null, syllabusCode, notes: [] }
      : await matchPastPaperSubject({
          syllabusCode,
          filters: { board: "Cambridge IGCSE", qualification: "IGCSE", subject: "Chemistry" },
        });

  const subject = match.entry?.subject || str(meta?.subject) || "Chemistry";
  const board = match.entry?.board || "Cambridge IGCSE";
  const qualification = match.entry?.level || "IGCSE";
  const country = match.entry?.country || null;
  const curriculumCode = match.entry?.code || null;

  if (status === "NEW" && match.status === "UNMATCHED_SUBJECT") {
    status = "UNMATCHED_SUBJECT";
    error = match.notes[0] || "Subject could not be matched to curriculum.json";
  }

  const catalogKey =
    board && subject && year
      ? importedCatalogKey({
          board,
          subject,
          year,
          documentType,
          session,
          componentCode,
        })
      : null;

  const dup =
    status === "INVALID"
      ? null
      : await findDuplicatePaper({
          checksum: entry.checksum,
          curriculumCode,
          syllabusCode,
          year,
          session,
          componentCode,
          documentType,
          catalogKey,
          storageKey: entry.storageKey,
        });
  if (dup && (status === "NEW" || status === "REQUIRES_REVIEW")) {
    status = "ALREADY_EXISTS";
    error = `Already exists (${dup.reason})`;
  }

  const storedFilename =
    board && subject && year
      ? buildStoredFilename({
          board,
          qualification,
          subject,
          syllabusCode,
          year,
          session,
          componentCode,
          documentType,
        })
      : null;

  return {
    originalFilename,
    storageKey: entry.storageKey,
    status,
    error,
    checksum: entry.checksum,
    fileSize: entry.fileSize,
    year,
    session,
    subject,
    board,
    qualification,
    country,
    curriculumCode,
    syllabusCode,
    componentCode,
    paperNumber,
    variant,
    documentType,
    catalogKey,
    storedFilename,
    subjectId: match.subjectId,
  };
}

async function saveJobItems(adminId: string, sourceLabel: string, classified: ClassifiedManifestItem[]) {
  const counts = countByStatus(classified);
  return prisma.importJob.create({
    data: {
      adminId,
      source: R2_MANIFEST_SOURCE,
      status: "READY",
      board: "Cambridge IGCSE",
      qualification: "IGCSE",
      subject: "Chemistry",
      subjectCode: PHASE1_SYLLABUS_CODE,
      yearFrom: PHASE1_YEAR_FROM,
      yearTo: PHASE1_YEAR_TO,
      notes: sourceLabel,
      ...counts,
      items: {
        create: classified.map((item) => ({
          originalFilename: item.originalFilename,
          storedFilename: item.storedFilename,
          sourceUrl: item.storageKey ? `r2://${item.storageKey}` : null,
          stagingKey: item.storageKey || null,
          status: item.status,
          error: item.error,
          year: item.year,
          session: item.session,
          subject: item.subject,
          board: item.board,
          qualification: item.qualification,
          country: item.country,
          curriculumCode: item.curriculumCode,
          syllabusCode: item.syllabusCode,
          componentCode: item.componentCode,
          paperNumber: item.paperNumber,
          variant: item.variant,
          documentType: item.documentType,
          catalogKey: item.catalogKey,
          checksum: item.checksum,
          fileSize: item.fileSize,
          mimeType: "application/pdf",
          selected: item.status === "NEW",
        })),
      },
    },
    include: { items: { orderBy: [{ year: "desc" }, { originalFilename: "asc" }] } },
  });
}

export async function previewManifestEntries(opts: {
  adminId: string;
  entries: ManifestEntry[];
  sourceLabel?: string;
}) {
  const pdfs = opts.entries.filter((row) => row.originalFilename.toLowerCase().endsWith(".pdf"));
  const classified: ClassifiedManifestItem[] = [];
  for (const entry of pdfs) {
    classified.push(await classifyManifestEntry(entry));
  }
  return saveJobItems(opts.adminId, opts.sourceLabel || "JSON manifest", classified);
}

export async function listR2EntriesForPhase1(prefix?: string) {
  if (!isR2Configured()) throw new Error(r2NotConfiguredMessage());
  const prefixes = prefix
    ? [prefix]
    : [(process.env.R2_PREFIX || "").trim(), ...PHASE1_PREFIXES].filter(Boolean);
  const seen = new Set<string>();
  const entries: ManifestEntry[] = [];
  const jsonKeys: string[] = [];

  for (const pfx of prefixes) {
    const objects = await listObjectSummaries(pfx);
    for (const obj of objects) {
      if (seen.has(obj.key)) continue;
      seen.add(obj.key);
      const lower = obj.key.toLowerCase();
      if (lower.endsWith(".json") && /manifest/.test(lower)) {
        jsonKeys.push(obj.key);
        continue;
      }
      if (!lower.endsWith(".pdf")) continue;
      const filename = basenameSafe(obj.key);
      if (!filename.includes(PHASE1_SYLLABUS_CODE)) continue;
      entries.push({
        originalFilename: filename,
        storageKey: obj.key,
        fileSize: obj.size,
        checksum: null,
      });
    }
    if (entries.length) break;
  }

  for (const key of jsonKeys.slice(0, 3)) {
    try {
      const text = await getObjectUtf8(key);
      const nested = parseManifestPayload(JSON.parse(text));
      for (const item of nested) {
        if (!item.storageKey || seen.has(item.storageKey)) continue;
        seen.add(item.storageKey);
        entries.push(item);
      }
    } catch {
      // JSON in the bucket is optional; listing PDFs is enough.
    }
  }

  return entries;
}

export async function previewR2List(opts: { adminId: string; prefix?: string }) {
  const entries = await listR2EntriesForPhase1(opts.prefix);
  if (!entries.length) {
    throw new Error(
      `No ${PHASE1_SYLLABUS_CODE} PDFs found in R2. Check R2_BUCKET and R2_PREFIX (default ${DEFAULT_R2_PREFIX}).`,
    );
  }
  return previewManifestEntries({
    adminId: opts.adminId,
    entries,
    sourceLabel: `R2 list ${opts.prefix || process.env.R2_PREFIX || DEFAULT_R2_PREFIX}`,
  });
}

export async function commitManifestJob(opts: {
  jobId: string;
  adminId: string;
  itemIds?: string[];
  replaceExisting?: boolean;
}) {
  const job = await prisma.importJob.findUnique({
    where: { id: opts.jobId },
    include: { items: true },
  });
  if (!job) throw new Error("Import job not found");
  if (job.source !== R2_MANIFEST_SOURCE) {
    throw new Error("This job is not an R2 manifest ingest");
  }

  await prisma.importJob.update({ where: { id: job.id }, data: { status: "IMPORTING" } });
  const selected = opts.itemIds?.length
    ? job.items.filter((item) => opts.itemIds!.includes(item.id))
    : job.items.filter((item) => item.status === "NEW" || item.status === "ALREADY_EXISTS");

  const flags = pastPaperVisibility(true, true);

  for (const item of selected) {
    try {
      const storageKey = item.stagingKey || item.sourceUrl?.replace(/^r2:\/\//, "") || "";
      if (!storageKey) throw new Error("Missing R2 object key");
      if (!item.subject || !item.board || !item.year || !item.documentType) {
        throw new Error("Subject, board, year, and document type are required");
      }

      const paperType = documentTypeLabel(item.documentType);
      const catalogKey =
        item.catalogKey ||
        importedCatalogKey({
          board: item.board,
          subject: item.subject,
          year: item.year,
          documentType: item.documentType,
          paperType,
          session: item.session,
          componentCode: item.componentCode,
        });
      const storedFilename =
        item.storedFilename ||
        buildStoredFilename({
          board: item.board,
          qualification: item.qualification,
          subject: item.subject,
          syllabusCode: item.syllabusCode,
          year: item.year,
          session: item.session,
          componentCode: item.componentCode,
          documentType: item.documentType,
        });

      const dup = await findDuplicatePaper({
        checksum: item.checksum,
        curriculumCode: item.curriculumCode,
        syllabusCode: item.syllabusCode,
        year: item.year,
        session: item.session,
        componentCode: item.componentCode,
        documentType: item.documentType,
        catalogKey,
        storageKey,
      });

      const match = await matchPastPaperSubject({
        syllabusCode: item.syllabusCode,
        curriculumCode: item.curriculumCode,
        filters: {
          board: item.board,
          qualification: item.qualification || undefined,
          subject: item.subject,
        },
      });

      const title = [
        item.subject,
        item.board,
        item.year,
        item.session,
        item.componentCode ? `Paper ${item.componentCode}` : null,
        paperType,
      ]
        .filter(Boolean)
        .join(" · ");

      const data = {
        catalogKey,
        subject: item.subject,
        board: item.board,
        year: item.year,
        paperType,
        title,
        fileUrl: null as string | null,
        ...flags,
        subjectId: match.subjectId,
        country: item.country || match.entry?.country || null,
        qualification: item.qualification || match.entry?.level || null,
        curriculumCode: item.curriculumCode || match.entry?.code || null,
        syllabusCode: item.syllabusCode || PHASE1_SYLLABUS_CODE,
        session: item.session,
        paperNumber: item.paperNumber || (item.componentCode && /^\d/.test(item.componentCode) ? item.componentCode[0] : null),
        componentCode: item.componentCode,
        variant: item.variant,
        documentType: item.documentType,
        originalFilename: item.originalFilename,
        storedFilename,
        sourceUrl: `r2://${storageKey}`,
        sourceDomain: "r2",
        storageKey,
        storageProvider: "R2",
        fileSize: item.fileSize,
        mimeType: "application/pdf",
        importStatus: dup ? "UPDATED" : "IMPORTED",
        checksum: item.checksum,
      };

      const paper = dup?.paper
        ? await prisma.pastPaper.update({
            where: { id: dup.paper.id },
            data: {
              ...data,
              checksum: item.checksum || dup.paper.checksum,
              fileSize: item.fileSize ?? dup.paper.fileSize,
            },
          })
        : await prisma.pastPaper.create({ data });

      await prisma.importJobItem.update({
        where: { id: item.id },
        data: {
          status: dup ? "ALREADY_EXISTS" : "IMPORTED",
          error: dup ? `Updated existing row (${dup.reason})` : null,
          pastPaperId: paper.id,
          catalogKey,
          storedFilename,
          selected: false,
        },
      });
    } catch (err) {
      await prisma.importJobItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : "Import failed",
        },
      });
    }
  }

  const items = await prisma.importJobItem.findMany({ where: { jobId: job.id } });
  return prisma.importJob.update({
    where: { id: job.id },
    data: {
      ...countByStatus(items),
      status: jobStatusFromItems(items),
    },
    include: { items: { orderBy: [{ year: "desc" }, { originalFilename: "asc" }] } },
  });
}

export async function headOnePhase1Object() {
  if (!isR2Configured()) throw new Error(r2NotConfiguredMessage());
  const entries = await listR2EntriesForPhase1();
  const first = entries.find((row) => row.storageKey.toLowerCase().endsWith(".pdf"));
  if (!first) throw new Error("No 0620 PDF keys found to HEAD");
  const head = await headObject(first.storageKey);
  return { ...head, listed: entries.length };
}
