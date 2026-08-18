import { prisma } from "@/lib/prisma";
import { parseHttpsPdfUrl, parseUrlList } from "./allowlist";
import { importedCatalogKey } from "./catalog-key";
import { DOWNLOAD_DELAY_MS, MAX_CONCURRENT_DOWNLOADS } from "./constants";
import { findDuplicatePaper } from "./duplicates";
import { basenameSafe, validatePdfBuffer } from "./file-validate";
import { getSourceAdapter, SourceNotEnabledError } from "./sources";
import { fetchDirectPdf } from "./sources/url-list";
import { buildStoredFilename, documentTypeLabel } from "./stored-filename";
import { uploadPastPaperBlob } from "./storage";
import { matchPastPaperSubject } from "./subject-matcher";
import type {
  ImportItemStatus,
  ImportJobStatus,
  PastPaperSourceId,
  ScanFilters,
} from "./types";

export type ScanInput = ScanFilters & {
  source: PastPaperSourceId;
  adminId: string;
  urlsText?: string;
  files?: { filename: string; buffer: Buffer; mimeType?: string }[];
};

export type ItemOverride = {
  subject?: string;
  board?: string;
  qualification?: string;
  year?: number;
  session?: string;
  componentCode?: string;
  documentType?: string;
  curriculumCode?: string;
  syllabusCode?: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
      if (index < items.length - 1) await delay(DOWNLOAD_DELAY_MS);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

function visibility(isPublic = true, isActive = true) {
  return {
    isPublic,
    isActive,
    published: Boolean(isPublic && isActive),
  };
}

function countByStatus(items: { status: string }[]) {
  const newCount = items.filter((row) => row.status === "NEW").length;
  const existsCount = items.filter((row) => row.status === "ALREADY_EXISTS").length;
  const importedCount = items.filter((row) => row.status === "IMPORTED" || row.status === "REPLACED").length;
  const failedCount = items.filter((row) =>
    ["INVALID", "FAILED", "UNAVAILABLE"].includes(row.status),
  ).length;
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
  if (imported && pending) return "PARTIAL";
  if (imported && failed) return "PARTIAL";
  if (imported && !pending) return "COMPLETED";
  if (failed && !pending && !imported) return "FAILED";
  return "READY";
}

type ClassifiedItem = {
  originalFilename: string;
  status: ImportItemStatus;
  error: string | null;
  checksum: string | null;
  fileSize: number | null;
  mimeType: string | null;
  stagingUrl: string | null;
  stagingKey: string | null;
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
  sourceUrl: string | null;
  sourceDomain: string | null;
};

async function classifyFile(opts: {
  filename: string;
  buffer?: Buffer;
  mimeType?: string;
  sourceUrl?: string;
  filters: ScanFilters;
  adapterId: PastPaperSourceId;
}): Promise<ClassifiedItem> {
  const adapter = getSourceAdapter(opts.adapterId);
  const originalFilename = basenameSafe(opts.filename);
  let status: ImportItemStatus = "NEW";
  let error: string | null = null;
  let checksum: string | null = null;
  let fileSize: number | null = null;
  let mimeType = "application/pdf";

  if (opts.buffer) {
    const validated = validatePdfBuffer(opts.buffer, originalFilename, opts.mimeType);
    if (!validated.ok) {
      return {
        originalFilename,
        status: "INVALID" as const,
        error: validated.error,
        checksum: null,
        fileSize: opts.buffer.length,
        mimeType: opts.mimeType || null,
        stagingUrl: null,
        stagingKey: null,
        year: null,
        session: null,
        subject: null,
        board: null,
        qualification: null,
        country: null,
        curriculumCode: null,
        syllabusCode: null,
        componentCode: null,
        paperNumber: null,
        variant: null,
        documentType: null,
        catalogKey: null,
        storedFilename: null,
        sourceUrl: opts.sourceUrl || null,
        sourceDomain: null,
      };
    }
    checksum = validated.checksum;
    fileSize = validated.size;
    mimeType = validated.mimeType;
  }

  const parsed = adapter.parseMetadata(originalFilename);
  let year: number | null = null;
  let session: string | null = null;
  let documentType: string | null = null;
  let syllabusCode: string | null = null;
  let componentCode: string | null = null;
  let paperNumber: string | null = null;
  let variant: string | null = null;

  if (!parsed.ok) {
    status = parsed.status;
    error = parsed.error;
  } else {
    year = parsed.metadata.year;
    session = parsed.metadata.sessionLabel;
    documentType = parsed.metadata.documentType;
    syllabusCode = parsed.metadata.syllabusCode;
    componentCode = parsed.metadata.componentCode;
    paperNumber = parsed.metadata.paperNumber;
    variant = parsed.metadata.variant;
    if (parsed.metadata.confidence === "review") {
      status = "REQUIRES_REVIEW";
      error = parsed.metadata.notes.join("; ") || "Needs review";
    }
  }

  if (opts.filters.yearFrom && year && year < opts.filters.yearFrom) {
    status = "REQUIRES_REVIEW";
    error = `Year ${year} is before the from-year filter`;
  }
  if (opts.filters.yearTo && year && year > opts.filters.yearTo) {
    status = "REQUIRES_REVIEW";
    error = `Year ${year} is after the to-year filter`;
  }
  if (opts.filters.session && session && session !== opts.filters.session) {
    status = "REQUIRES_REVIEW";
    error = `Session ${session} does not match filter`;
  }
  if (opts.filters.documentType && documentType && documentType !== opts.filters.documentType) {
    status = "REQUIRES_REVIEW";
    error = `Type ${documentType} does not match filter`;
  }

  const match =
    status === "INVALID"
      ? { status: "UNMATCHED_SUBJECT" as const, entry: null, subjectId: null, syllabusCode, notes: [] }
      : await matchPastPaperSubject({
          syllabusCode,
          filters: opts.filters,
        });

  const subject = match.entry?.subject || opts.filters.subject || null;
  const board = match.entry?.board || opts.filters.board || null;
  const qualification = match.entry?.level || opts.filters.qualification || null;
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

  if (checksum && status !== "INVALID") {
    const dup = await findDuplicatePaper({
      checksum,
      curriculumCode,
      syllabusCode,
      year,
      session,
      componentCode,
      documentType,
      catalogKey,
    });
    if (dup) {
      status = "ALREADY_EXISTS";
      error = `Already exists (${dup.reason})`;
    }
  }

  return {
    originalFilename,
    status,
    error,
    checksum,
    fileSize,
    mimeType,
    stagingUrl: null,
    stagingKey: null,
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
    sourceUrl: opts.sourceUrl || null,
    sourceDomain: opts.sourceUrl ? safeDomain(opts.sourceUrl) : null,
  };
}

function safeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function scanPastPapers(input: ScanInput) {
  const adapter = getSourceAdapter(input.source);
  if (!adapter.enabled) {
    throw new SourceNotEnabledError(adapter.label);
  }

  const job = await prisma.importJob.create({
    data: {
      adminId: input.adminId,
      source: input.source,
      status: "SCANNING",
      board: input.board || null,
      qualification: input.qualification || null,
      subject: input.subject || null,
      subjectCode: input.subjectCode || null,
      yearFrom: input.yearFrom || null,
      yearTo: input.yearTo || null,
      session: input.session || null,
      documentType: input.documentType || null,
    },
  });

  const filters: ScanFilters = {
    board: input.board,
    qualification: input.qualification,
    subject: input.subject,
    subjectCode: input.subjectCode,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo,
    session: input.session,
    documentType: input.documentType,
  };

  type Prepared = {
    filename: string;
    buffer?: Buffer;
    mimeType?: string;
    sourceUrl?: string;
    failStatus?: ImportItemStatus;
    failError?: string;
  };

  const prepared: Prepared[] = [];

  if (input.source === "URL_LIST") {
    const urls = parseUrlList(input.urlsText || "");
    if (!urls.length) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: "FAILED", notes: "No URLs provided" },
      });
      throw new Error("Paste one HTTPS PDF URL per line");
    }
    const fetched = await mapPool(urls, MAX_CONCURRENT_DOWNLOADS, async (raw) => {
      const parsed = parseHttpsPdfUrl(raw);
      if (!parsed.ok) {
        return {
          filename: basenameSafe(raw),
          sourceUrl: raw,
          failStatus: "UNAVAILABLE" as const,
          failError: parsed.error,
        };
      }
      const downloaded = await fetchDirectPdf(parsed.url.toString());
      if (!downloaded.ok) {
        return {
          filename: downloaded.originalFilename,
          sourceUrl: parsed.url.toString(),
          failStatus: downloaded.error.startsWith("HTTP") || downloaded.error === "Timed out" ? ("UNAVAILABLE" as const) : ("INVALID" as const),
          failError: downloaded.error,
        };
      }
      return {
        filename: downloaded.originalFilename,
        buffer: downloaded.buffer,
        mimeType: downloaded.mimeType,
        sourceUrl: parsed.url.toString(),
      };
    });
    prepared.push(...fetched);
  } else {
    for (const file of input.files || []) {
      prepared.push({
        filename: file.filename,
        buffer: file.buffer,
        mimeType: file.mimeType,
      });
    }
    if (!prepared.length) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: "FAILED", notes: "No files uploaded" },
      });
      throw new Error("Upload one or more PDF files to scan");
    }
  }

  const classified: ClassifiedItem[] = [];
  for (const item of prepared) {
    if (item.failStatus) {
      classified.push({
        originalFilename: item.filename,
        status: item.failStatus,
        error: item.failError || "Unavailable",
        checksum: null,
        fileSize: null,
        mimeType: null,
        stagingUrl: null,
        stagingKey: null,
        year: null,
        session: null,
        subject: null,
        board: null,
        qualification: null,
        country: null,
        curriculumCode: null,
        syllabusCode: null,
        componentCode: null,
        paperNumber: null,
        variant: null,
        documentType: null,
        catalogKey: null,
        storedFilename: null,
        sourceUrl: item.sourceUrl || null,
        sourceDomain: item.sourceUrl ? safeDomain(item.sourceUrl) : null,
      });
      continue;
    }
    const row = await classifyFile({
      filename: item.filename,
      buffer: item.buffer,
      mimeType: item.mimeType,
      sourceUrl: item.sourceUrl,
      filters,
      adapterId: input.source,
    });
    if (item.buffer && row.status !== "INVALID") {
      try {
        const uploaded = await uploadPastPaperBlob({
          pathname: `staging/${job.id}/${basenameSafe(item.filename)}`,
          buffer: item.buffer,
        });
        row.stagingUrl = uploaded.url;
        row.stagingKey = uploaded.pathname;
      } catch (err) {
        row.status = "FAILED";
        row.error = err instanceof Error ? err.message : "Could not store staging file";
      }
    }
    classified.push(row);
  }

  await prisma.importJobItem.createMany({
    data: classified.map((row) => ({
      jobId: job.id,
      originalFilename: row.originalFilename,
      storedFilename: row.storedFilename,
      sourceUrl: row.sourceUrl,
      sourceDomain: row.sourceDomain,
      stagingUrl: row.stagingUrl,
      stagingKey: row.stagingKey,
      status: row.status,
      year: row.year,
      session: row.session,
      subject: row.subject,
      board: row.board,
      qualification: row.qualification,
      country: row.country,
      curriculumCode: row.curriculumCode,
      syllabusCode: row.syllabusCode,
      componentCode: row.componentCode,
      paperNumber: row.paperNumber,
      variant: row.variant,
      documentType: row.documentType,
      catalogKey: row.catalogKey,
      checksum: row.checksum,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      error: row.error,
      selected: row.status === "NEW",
    })),
  });

  const counts = countByStatus(classified);
  const status = jobStatusFromItems(classified);
  const saved = await prisma.importJob.update({
    where: { id: job.id },
    data: { ...counts, status },
    include: { items: { orderBy: { originalFilename: "asc" } } },
  });
  return saved;
}

async function bufferFromStaging(url: string) {
  const res = await fetch(url, { headers: { Accept: "application/pdf" } });
  if (!res.ok) throw new Error(`Could not read staged file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function importSelectedItems(opts: {
  jobId: string;
  adminId: string;
  itemIds: string[];
  replaceExisting?: boolean;
  overrides?: Record<string, ItemOverride>;
}) {
  const job = await prisma.importJob.findUnique({
    where: { id: opts.jobId },
    include: { items: true },
  });
  if (!job) throw new Error("Import job not found");

  await prisma.importJob.update({ where: { id: job.id }, data: { status: "IMPORTING" } });

  const selected = job.items.filter((item) => opts.itemIds.includes(item.id));

  for (const item of selected) {
    const override = opts.overrides?.[item.id] || {};
    const subject = override.subject || item.subject;
    const board = override.board || item.board;
    const qualification = override.qualification || item.qualification;
    const year = override.year || item.year;
    const session = override.session || item.session;
    const componentCode = override.componentCode || item.componentCode;
    const documentType = override.documentType || item.documentType;
    const curriculumCode = override.curriculumCode || item.curriculumCode;
    const syllabusCode = override.syllabusCode || item.syllabusCode;

    try {
      if (!item.stagingUrl && !item.sourceUrl) {
        throw new Error("No staged file or source URL");
      }
      if (!subject || !board || !year || !documentType) {
        throw new Error("Subject, board, year, and document type are required");
      }

      const paperType = documentTypeLabel(documentType);
      const catalogKey = importedCatalogKey({
        board,
        subject,
        year,
        documentType,
        paperType,
        session,
        componentCode,
      });
      const storedFilename = buildStoredFilename({
        board,
        qualification,
        subject,
        syllabusCode,
        year,
        session,
        componentCode,
        documentType,
      });

      const dup = await findDuplicatePaper({
        checksum: item.checksum,
        curriculumCode,
        syllabusCode,
        year,
        session,
        componentCode,
        documentType,
        catalogKey,
      });
      if (dup && !opts.replaceExisting) {
        await prisma.importJobItem.update({
          where: { id: item.id },
          data: {
            status: "ALREADY_EXISTS",
            error: `Already exists (${dup.reason})`,
            pastPaperId: dup.paper.id,
            catalogKey,
          },
        });
        continue;
      }

      let buffer: Buffer;
      if (item.stagingUrl) {
        buffer = await bufferFromStaging(item.stagingUrl);
      } else if (item.sourceUrl) {
        const downloaded = await fetchDirectPdf(item.sourceUrl);
        if (!downloaded.ok) throw new Error(downloaded.error);
        buffer = downloaded.buffer;
      } else {
        throw new Error("No file to import");
      }

      const validated = validatePdfBuffer(buffer, storedFilename, "application/pdf");
      if (!validated.ok) throw new Error(validated.error);

      const uploaded = await uploadPastPaperBlob({
        pathname: storedFilename.replace(/\.pdf$/i, ""),
        buffer: validated.buffer,
      });
      const match = await matchPastPaperSubject({
        syllabusCode,
        curriculumCode,
        filters: {
          board: board || undefined,
          qualification: qualification || undefined,
          subject,
          subjectCode: curriculumCode || syllabusCode || undefined,
        },
      });
      const flags = visibility(true, true);
      const title = [
        subject,
        board,
        year,
        session,
        componentCode ? `Paper ${componentCode}` : null,
        paperType,
      ]
        .filter(Boolean)
        .join(" · ");

      const data = {
        catalogKey,
        subject,
        board,
        year,
        paperType,
        title,
        fileUrl: uploaded.url,
        ...flags,
        subjectId: match.subjectId,
        country: item.country || match.entry?.country || null,
        qualification: qualification || match.entry?.level || null,
        curriculumCode: curriculumCode || match.entry?.code || null,
        syllabusCode: syllabusCode || null,
        session,
        paperNumber: item.paperNumber || (componentCode ? componentCode[0] : null),
        componentCode,
        variant: item.variant,
        documentType,
        originalFilename: item.originalFilename,
        storedFilename,
        sourceUrl: item.sourceUrl,
        sourceDomain: item.sourceDomain,
        storageKey: uploaded.pathname,
        storageProvider: "BLOB",
        fileSize: validated.size,
        mimeType: "application/pdf",
        importStatus: dup && opts.replaceExisting ? "REPLACED" : "IMPORTED",
        checksum: validated.checksum,
      };

      const paper = dup?.paper
        ? await prisma.pastPaper.update({ where: { id: dup.paper.id }, data })
        : await prisma.pastPaper.create({ data });

      await prisma.importJobItem.update({
        where: { id: item.id },
        data: {
          status: dup && opts.replaceExisting ? "REPLACED" : "IMPORTED",
          error: null,
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
  const counts = countByStatus(items);
  const saved = await prisma.importJob.update({
    where: { id: job.id },
    data: {
      ...counts,
      status: jobStatusFromItems(items),
    },
    include: { items: { orderBy: { originalFilename: "asc" } } },
  });
  return saved;
}

export { visibility as pastPaperVisibility };
