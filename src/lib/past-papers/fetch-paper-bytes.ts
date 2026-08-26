import { URL_FETCH_TIMEOUT_MS, MAX_PAST_PAPER_BYTES } from "./constants";
import { validatePdfBuffer, basenameSafe } from "./file-validate";
import { getObjectBytes, isR2Configured, r2NotConfiguredMessage } from "./r2";
import { isR2Paper } from "./availability";

export type FetchedPastPaperPdf = {
  buffer: Buffer;
  filename: string;
};

function filenameFromStorageKey(storageKey: string) {
  return basenameSafe(storageKey.replace(/\\/g, "/").split("/").pop() || "past-paper.pdf");
}

function filenameFromUrl(url: string) {
  try {
    return basenameSafe(new URL(url).pathname.split("/").pop() || "past-paper.pdf");
  } catch {
    return "past-paper.pdf";
  }
}

async function fetchExternalPdf(fileUrl: string): Promise<FetchedPastPaperPdf> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(fileUrl, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Could not fetch paper file (HTTP ${res.status})`);
    }
    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > MAX_PAST_PAPER_BYTES) {
      throw new Error("PDF exceeds maximum download size");
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = filenameFromUrl(fileUrl);
    const validated = validatePdfBuffer(buffer, filename, res.headers.get("content-type"));
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    return { buffer: validated.buffer, filename: validated.originalFilename };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPastPaperPdfBytes(paper: {
  storageKey?: string | null;
  fileUrl?: string | null;
  storageProvider?: string | null;
  catalogKey?: string;
}): Promise<FetchedPastPaperPdf> {
  if (isR2Paper(paper) && paper.storageKey) {
    if (!isR2Configured()) {
      throw new Error(r2NotConfiguredMessage());
    }
    const buffer = await getObjectBytes(paper.storageKey);
    const filename = filenameFromStorageKey(paper.storageKey);
    const validated = validatePdfBuffer(buffer, filename, "application/pdf");
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    return { buffer: validated.buffer, filename: validated.originalFilename };
  }

  if (paper.fileUrl) {
    return fetchExternalPdf(paper.fileUrl);
  }

  throw new Error("This paper is not available yet");
}
