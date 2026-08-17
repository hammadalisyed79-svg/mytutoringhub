import { createHash } from "node:crypto";
import { EXECUTABLE_EXTENSIONS, MAX_PAST_PAPER_BYTES, PDF_MAGIC } from "./constants";
import type { DownloadedFile } from "./types";

export function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function basenameSafe(filename: string) {
  const base = filename.replace(/\\/g, "/").split("/").pop() || "paper.pdf";
  return base.replace(/\0/g, "").trim();
}

export function sanitizeStoredSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function isUnsafeFilename(filename: string) {
  const base = basenameSafe(filename);
  if (!base || base === "." || base === "..") return true;
  if (base.includes("..") || base.includes("\0")) return true;
  if (/[<>:"|?*]/.test(base)) return true;
  const lower = base.toLowerCase();
  return EXECUTABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function looksLikeHtml(buffer: Buffer) {
  const head = buffer.subarray(0, 256).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  return (
    head.startsWith("<!DOCTYPE") ||
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("<HTML") ||
    head.startsWith("<?xml")
  );
}

function hasPdfMagic(buffer: Buffer) {
  if (buffer.length < 5) return false;
  const start = buffer.subarray(0, 8).toString("latin1");
  return start.startsWith(PDF_MAGIC);
}

export function isAllowedPdfMime(mimeType?: string | null) {
  if (!mimeType) return true;
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  if (!mime) return true;
  if (mime === "application/pdf" || mime === "application/x-pdf") return true;
  if (mime === "application/octet-stream") return true;
  return false;
}

export function validatePdfBuffer(
  buffer: Buffer,
  filename: string,
  mimeType?: string | null,
): DownloadedFile {
  const originalFilename = basenameSafe(filename);
  if (isUnsafeFilename(originalFilename)) {
    return { ok: false, status: "INVALID", error: "Filename is not allowed", originalFilename };
  }
  if (!originalFilename.toLowerCase().endsWith(".pdf")) {
    return { ok: false, status: "INVALID", error: "Only PDF files are accepted", originalFilename };
  }
  if (buffer.length < 8) {
    return { ok: false, status: "INVALID", error: "File is too small to be a PDF", originalFilename };
  }
  if (buffer.length > MAX_PAST_PAPER_BYTES) {
    return { ok: false, status: "INVALID", error: "PDF must be under 12MB", originalFilename };
  }
  if (looksLikeHtml(buffer)) {
    return { ok: false, status: "INVALID", error: "Response is HTML, not a PDF", originalFilename };
  }
  if (!hasPdfMagic(buffer)) {
    return { ok: false, status: "INVALID", error: "File is not a valid PDF", originalFilename };
  }
  if (!isAllowedPdfMime(mimeType)) {
    return {
      ok: false,
      status: "INVALID",
      error: `Unexpected MIME type (${mimeType})`,
      originalFilename,
    };
  }
  return {
    ok: true,
    buffer,
    mimeType: "application/pdf",
    size: buffer.length,
    checksum: sha256(buffer),
    originalFilename,
  };
}
