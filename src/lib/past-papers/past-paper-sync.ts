import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/search-tutors";
import { importedCatalogKey } from "./catalog-key";
import { parseCambridgeFilename } from "./cambridge-filename-parser";
import { CAMBRIDGE_SYLLABUS_MAP } from "./constants";
import { basenameSafe } from "./file-validate";
import { pastPaperVisibility } from "./import-service";
import {
  isR2Configured,
  listCommonPrefixes,
  listObjectSummaries,
  r2NotConfiguredMessage,
} from "./r2";
import { buildStoredFilename, documentTypeLabel } from "./stored-filename";
import { matchCurriculumEntry } from "./subject-matcher";
import { parseFbiseStoragePath } from "./fbise-path-parser";

export const DEFAULT_R2_PAPERS_PREFIX = "cambridge/";
export const FBISE_R2_PAPERS_PREFIX = "fbise/";
export const MAX_R2_PAPER_KEYS = 20_000;
const CREATE_CHUNK = 75;
const UPDATE_CHUNK = 20;

export type ClassifiedR2Paper = {
  storageKey: string;
  fileSize: number;
  originalFilename: string;
  syllabusCode: string;
  year: number;
  session: string;
  documentType: string;
  componentCode: string;
  paperNumber: string | null;
  variant: string | null;
  subject: string;
  board: string;
  qualification: string;
  country: string | null;
  curriculumCode: string | null;
  catalogKey: string;
  paperType: string;
  title: string;
  storedFilename: string;
};

export type SkippedR2Object = {
  storageKey: string;
  reason: string;
};

export type PastPaperSyncResult = {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  listed: number;
  parsed: number;
  total: number;
  truncated: boolean;
  r2Configured: boolean;
  prefixes: string[];
  warning?: string;
};

function boardForLevel(level: string) {
  if (/o\s*level/i.test(level)) return "Cambridge O Level";
  if (/a\s*level|as\s*level/i.test(level)) return "Cambridge A Level";
  return "Cambridge IGCSE";
}

export function r2PaperListPrefixes() {
  const prefixes: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const value = raw.trim().replace(/^\/+/, "");
    if (!value) return;
    const key = value.endsWith("/") ? value : `${value}/`;
    if (seen.has(key)) return;
    seen.add(key);
    prefixes.push(key);
  };
  push(DEFAULT_R2_PAPERS_PREFIX);
  push(FBISE_R2_PAPERS_PREFIX);
  push(process.env.R2_PREFIX || "");
  return prefixes;
}

export function classifyR2PaperObject(
  key: string,
  size = 0,
): { ok: true; paper: ClassifiedR2Paper } | { ok: false; skip: SkippedR2Object } {
  const storageKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!storageKey || storageKey.endsWith("/")) {
    return { ok: false, skip: { storageKey: storageKey || key, reason: "Not a file" } };
  }
  if (!storageKey.toLowerCase().endsWith(".pdf")) {
    return { ok: false, skip: { storageKey, reason: "Not a PDF" } };
  }

  if (storageKey.toLowerCase().startsWith(FBISE_R2_PAPERS_PREFIX)) {
    const fbise = parseFbiseStoragePath(storageKey, size);
    if (!fbise.ok) {
      return { ok: false, skip: { storageKey, reason: fbise.error } };
    }
    const paper = fbise.paper;
    const catalogKey = importedCatalogKey({
      board: paper.board,
      subject: paper.subject,
      year: paper.year,
      documentType: paper.documentType,
      paperType: paper.paperType,
      session: paper.session,
      componentCode: paper.componentCode || null,
    });
    const storedFilename = buildStoredFilename({
      board: paper.board,
      qualification: paper.qualification,
      subject: paper.subject,
      syllabusCode: paper.curriculumCode,
      year: paper.year,
      session: paper.session,
      componentCode: paper.componentCode || null,
      documentType: paper.documentType,
    });
    return {
      ok: true,
      paper: {
        storageKey: paper.storageKey,
        fileSize: paper.fileSize,
        originalFilename: paper.originalFilename,
        syllabusCode: paper.syllabusCode || "",
        year: paper.year,
        session: paper.session || "",
        documentType: paper.documentType,
        componentCode: paper.componentCode,
        paperNumber: paper.paperNumber,
        variant: paper.variant,
        subject: paper.subject,
        board: paper.board,
        qualification: paper.qualification,
        country: paper.country,
        curriculumCode: paper.curriculumCode,
        catalogKey,
        paperType: paper.paperType,
        title: paper.title,
        storedFilename,
      },
    };
  }

  const originalFilename = basenameSafe(storageKey);
  const parsed = parseCambridgeFilename(originalFilename);
  if (!parsed.ok) {
    return {
      ok: false,
      skip: { storageKey, reason: parsed.error || "Filename is not a Cambridge paper" },
    };
  }

  const syllabusCode = parsed.metadata.syllabusCode;
  const mapped = CAMBRIDGE_SYLLABUS_MAP[syllabusCode];
  const match = matchCurriculumEntry(syllabusCode, {
    subject: mapped?.subject,
    qualification: mapped?.level,
    board: mapped ? boardForLevel(mapped.level) : "Cambridge",
  });
  if (!mapped && !match) {
    return {
      ok: false,
      skip: { storageKey, reason: `Unknown syllabus code ${syllabusCode}` },
    };
  }

  const subject = match?.subject || mapped!.subject;
  const qualification = match?.level || mapped!.level;
  const board = match?.board || boardForLevel(qualification);
  const year = parsed.metadata.year;
  const session = parsed.metadata.sessionLabel;
  const documentType = parsed.metadata.documentType;
  const componentCode = parsed.metadata.componentCode || "";
  const paperType = documentTypeLabel(documentType);
  const catalogKey = importedCatalogKey({
    board,
    subject,
    year,
    documentType,
    paperType,
    session,
    componentCode: componentCode || null,
  });
  const title = [subject, board, year, session, componentCode ? `Paper ${componentCode}` : null, paperType]
    .filter(Boolean)
    .join(" · ");
  const storedFilename = buildStoredFilename({
    board,
    qualification,
    subject,
    syllabusCode,
    year,
    session,
    componentCode: componentCode || null,
    documentType,
  });

  return {
    ok: true,
    paper: {
      storageKey,
      fileSize: size,
      originalFilename,
      syllabusCode,
      year,
      session,
      documentType,
      componentCode,
      paperNumber: parsed.metadata.paperNumber || null,
      variant: parsed.metadata.variant,
      subject,
      board,
      qualification,
      country: match?.country || null,
      curriculumCode: match?.code || null,
      catalogKey,
      paperType,
      title,
      storedFilename,
    },
  };
}

function uniqueCatalogKey(preferred: string, used: Set<string>, extras: string[]) {
  if (!used.has(preferred)) return preferred;
  for (const extra of extras) {
    const token = slugify(extra);
    if (!token) continue;
    const next = `${preferred}__${token}`;
    if (!used.has(next)) return next;
  }
  let i = 2;
  while (used.has(`${preferred}__${i}`)) i += 1;
  return `${preferred}__${i}`;
}

async function listR2PaperObjects() {
  const prefixes = r2PaperListPrefixes();
  const seen = new Set<string>();
  const objects: { key: string; size: number }[] = [];
  let truncated = false;

  const absorb = (rows: { key: string; size: number }[]) => {
    for (const row of rows) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);
      objects.push(row);
      if (objects.length >= MAX_R2_PAPER_KEYS) {
        truncated = true;
        return true;
      }
    }
    return false;
  };

  for (const prefix of prefixes) {
    const rows = await listObjectSummaries(prefix, MAX_R2_PAPER_KEYS);
    if (absorb(rows)) break;
  }

  if (objects.length === 0) {
    const roots = await listCommonPrefixes("", 30);
    for (const root of roots) {
      if (root.startsWith("catalog/") || root.startsWith("manifests/")) continue;
      const rows = await listObjectSummaries(root, MAX_R2_PAPER_KEYS);
      if (absorb(rows)) break;
    }
  }

  if (objects.length === 0) {
    const rows = await listObjectSummaries("", MAX_R2_PAPER_KEYS);
    absorb(rows);
  }

  return { objects, prefixes, truncated };
}

type ExistingRow = {
  id: string;
  catalogKey: string;
  storageKey: string | null;
  fileSize: number | null;
  originalFilename: string | null;
  storedFilename: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  mimeType: string | null;
  storageProvider: string | null;
  subject: string;
  board: string;
  year: number;
  paperType: string;
  title: string;
  session: string | null;
  componentCode: string | null;
  documentType: string | null;
  syllabusCode: string | null;
  qualification: string | null;
  country: string | null;
  curriculumCode: string | null;
  paperNumber: string | null;
  variant: string | null;
  subjectId: string | null;
  fileUrl: string | null;
};

function needsUpdate(
  row: ExistingRow,
  paper: ClassifiedR2Paper,
  subjectId: string | null,
): Prisma.PastPaperUpdateInput | null {
  const next = {
    subject: paper.subject,
    board: paper.board,
    year: paper.year,
    paperType: paper.paperType,
    title: paper.title,
    fileUrl: null as string | null,
    subjectId,
    country: paper.country,
    qualification: paper.qualification,
    curriculumCode: paper.curriculumCode,
    syllabusCode: paper.syllabusCode,
    session: paper.session,
    paperNumber: paper.paperNumber,
    componentCode: paper.componentCode || null,
    variant: paper.variant,
    documentType: paper.documentType,
    originalFilename: paper.originalFilename,
    storedFilename: paper.storedFilename,
    sourceUrl: `r2://${paper.storageKey}`,
    sourceDomain: "r2",
    storageKey: paper.storageKey,
    storageProvider: "R2",
    fileSize: paper.fileSize || row.fileSize,
    mimeType: "application/pdf",
    importStatus: "SYNCED",
  };

  const changed =
    row.storageKey !== next.storageKey ||
    row.storageProvider !== next.storageProvider ||
    (paper.fileSize > 0 && row.fileSize !== next.fileSize) ||
    row.originalFilename !== next.originalFilename ||
    row.storedFilename !== next.storedFilename ||
    row.sourceUrl !== next.sourceUrl ||
    row.sourceDomain !== next.sourceDomain ||
    row.mimeType !== next.mimeType ||
    row.subject !== next.subject ||
    row.board !== next.board ||
    row.year !== next.year ||
    row.paperType !== next.paperType ||
    row.title !== next.title ||
    row.session !== next.session ||
    (row.componentCode || null) !== next.componentCode ||
    row.documentType !== next.documentType ||
    row.syllabusCode !== next.syllabusCode ||
    row.qualification !== next.qualification ||
    row.country !== next.country ||
    row.curriculumCode !== next.curriculumCode ||
    row.paperNumber !== next.paperNumber ||
    row.variant !== next.variant ||
    row.subjectId !== next.subjectId ||
    Boolean(row.fileUrl);

  return changed ? next : null;
}

async function mapChunks<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

export async function syncPastPapersFromR2(): Promise<PastPaperSyncResult> {
  if (!isR2Configured()) {
    throw new Error(r2NotConfiguredMessage());
  }

  const { objects, prefixes, truncated } = await listR2PaperObjects();
  const classified: ClassifiedR2Paper[] = [];
  let skipped = 0;
  for (const obj of objects) {
    const result = classifyR2PaperObject(obj.key, obj.size);
    if (!result.ok) {
      skipped += 1;
      continue;
    }
    classified.push(result.paper);
  }

  const existing = await prisma.pastPaper.findMany({
    select: {
      id: true,
      catalogKey: true,
      storageKey: true,
      fileSize: true,
      originalFilename: true,
      storedFilename: true,
      sourceUrl: true,
      sourceDomain: true,
      mimeType: true,
      storageProvider: true,
      subject: true,
      board: true,
      year: true,
      paperType: true,
      title: true,
      session: true,
      componentCode: true,
      documentType: true,
      syllabusCode: true,
      qualification: true,
      country: true,
      curriculumCode: true,
      paperNumber: true,
      variant: true,
      subjectId: true,
      fileUrl: true,
    },
  });
  const byStorage = new Map(existing.filter((row) => row.storageKey).map((row) => [row.storageKey as string, row]));
  const byCatalog = new Map(existing.map((row) => [row.catalogKey, row]));
  const usedKeys = new Set(existing.map((row) => row.catalogKey));
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const subjectIdByName = new Map(subjects.map((row) => [row.name.toLowerCase(), row.id]));

  const toCreate: Prisma.PastPaperCreateManyInput[] = [];
  const toUpdate: { id: string; data: Prisma.PastPaperUpdateInput }[] = [];
  let unchanged = 0;
  const visibility = pastPaperVisibility(true, true);

  for (const paper of classified) {
    const subjectId = subjectIdByName.get(paper.subject.toLowerCase()) || null;
    const byKey = byStorage.get(paper.storageKey);
    const byName = byCatalog.get(paper.catalogKey);
    const attachable = byName && !byName.storageKey ? byName : null;
    const existingRow = byKey || attachable;
    if (existingRow) {
      const data = needsUpdate(existingRow, paper, subjectId);
      if (!data) {
        unchanged += 1;
        continue;
      }
      toUpdate.push({ id: existingRow.id, data });
      continue;
    }

    const catalogKey = uniqueCatalogKey(paper.catalogKey, usedKeys, [paper.syllabusCode, paper.originalFilename]);
    usedKeys.add(catalogKey);
    toCreate.push({
      catalogKey,
      subject: paper.subject,
      board: paper.board,
      year: paper.year,
      paperType: paper.paperType,
      title: paper.title,
      fileUrl: null,
      ...visibility,
      subjectId,
      country: paper.country,
      qualification: paper.qualification,
      curriculumCode: paper.curriculumCode,
      syllabusCode: paper.syllabusCode,
      session: paper.session,
      paperNumber: paper.paperNumber,
      componentCode: paper.componentCode || null,
      variant: paper.variant,
      documentType: paper.documentType,
      originalFilename: paper.originalFilename,
      storedFilename: paper.storedFilename,
      sourceUrl: `r2://${paper.storageKey}`,
      sourceDomain: "r2",
      storageKey: paper.storageKey,
      storageProvider: "R2",
      fileSize: paper.fileSize || null,
      mimeType: "application/pdf",
      importStatus: "SYNCED",
    });
  }

  await mapChunks(toCreate, CREATE_CHUNK, async (chunk) => {
    await prisma.pastPaper.createMany({ data: chunk, skipDuplicates: true });
  });
  await mapChunks(toUpdate, UPDATE_CHUNK, async (chunk) => {
    await Promise.all(chunk.map((row) => prisma.pastPaper.update({ where: { id: row.id }, data: row.data })));
  });

  const total = await prisma.pastPaper.count();
  const warnings: string[] = [];
  if (objects.length === 0) {
    warnings.push(
      `No objects were found in R2. Check R2_BUCKET and that PDFs live under ${prefixes.join(" or ") || DEFAULT_R2_PAPERS_PREFIX}.`,
    );
  } else if (classified.length === 0) {
    warnings.push(
      "R2 listed files, but none matched a Cambridge filename (e.g. 0620_s24_qp_42.pdf) or FBISE path (fbise/hssc/chemistry/...).",
    );
  }
  if (truncated) {
    warnings.push(`Stopped after ${MAX_R2_PAPER_KEYS.toLocaleString()} R2 objects. Run again after moving extra files, or raise the listing cap.`);
  }

  return {
    created: toCreate.length,
    updated: toUpdate.length,
    unchanged,
    skipped,
    listed: objects.length,
    parsed: classified.length,
    total,
    truncated,
    r2Configured: true,
    prefixes,
    ...(warnings.length ? { warning: warnings.join(" ") } : {}),
  };
}
