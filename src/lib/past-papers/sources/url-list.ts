import { parseHttpsPdfUrl } from "../allowlist";
import { parseCambridgeFilename } from "../cambridge-filename-parser";
import { URL_FETCH_TIMEOUT_MS } from "../constants";
import { basenameSafe, validatePdfBuffer } from "../file-validate";
import type { AvailableFileRef, DownloadedFile, SourceAdapter } from "../types";

function filenameFromUrl(url: URL) {
  const fromPath = basenameSafe(url.pathname);
  if (fromPath.toLowerCase().endsWith(".pdf")) return fromPath;
  return `${fromPath || "paper"}.pdf`;
}

export async function fetchDirectPdf(urlString: string, depth = 0): Promise<DownloadedFile> {
  const parsed = parseHttpsPdfUrl(urlString);
  if (!parsed.ok) {
    return {
      ok: false,
      status: "INVALID",
      error: parsed.error,
      originalFilename: basenameSafe(urlString),
    };
  }
  if (depth > 3) {
    return { ok: false, status: "INVALID", error: "Too many redirects", originalFilename: filenameFromUrl(parsed.url) };
  }
  const filename = filenameFromUrl(parsed.url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "application/pdf",
        "User-Agent": "MyTutoringHub/1.0 (admin past-paper import)",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") || "";
      if (!location) {
        return { ok: false, status: "INVALID", error: "Redirect without location", originalFilename: filename };
      }
      const next = parseHttpsPdfUrl(new URL(location, parsed.url).toString());
      if (!next.ok) {
        return { ok: false, status: "INVALID", error: next.error, originalFilename: filename };
      }
      return fetchDirectPdf(next.url.toString(), depth + 1);
    }
    if (!res.ok) {
      return {
        ok: false,
        status: "INVALID",
        error: `HTTP ${res.status}`,
        originalFilename: filename,
      };
    }
    const mime = res.headers.get("content-type");
    const buf = Buffer.from(await res.arrayBuffer());
    return validatePdfBuffer(buf, filename, mime);
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError" ? "Timed out" : err instanceof Error ? err.message : "Download failed";
    return { ok: false, status: "INVALID", error: message, originalFilename: filename };
  } finally {
    clearTimeout(timer);
  }
}

export const urlListAdapter: SourceAdapter = {
  id: "URL_LIST",
  label: "Allowlisted HTTPS PDF URLs",
  enabled: true,
  async scanSubject() {
    return [];
  },
  async getAvailableFiles() {
    return [];
  },
  parseMetadata(filename: string) {
    return parseCambridgeFilename(filename);
  },
  async downloadFile(ref: AvailableFileRef) {
    if (ref.bytes) return validatePdfBuffer(Buffer.from(ref.bytes), ref.filename, ref.mimeType);
    if (!ref.sourceUrl) {
      return { ok: false, status: "INVALID", error: "No URL provided", originalFilename: ref.filename };
    }
    return fetchDirectPdf(ref.sourceUrl);
  },
  validateFile(buffer, filename, mimeType) {
    return validatePdfBuffer(buffer, filename, mimeType);
  },
};
