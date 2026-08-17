import { put } from "@vercel/blob";
import { sanitizeStoredSegment } from "./file-validate";

export async function uploadPastPaperBlob(opts: {
  pathname: string;
  buffer: Buffer;
  contentType?: string;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Blob storage is not configured. Add BLOB_READ_WRITE_TOKEN.");
  }
  const safePath = opts.pathname
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => sanitizeStoredSegment(part.replace(/\.pdf$/i, "")) || "file")
    .join("/");
  const pathname = `${safePath}.pdf`.replace(/\.pdf\.pdf$/i, ".pdf");
  const uniquePath = `past-papers/${pathname.replace(/\.pdf$/i, "")}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.pdf`;
  const blob = await put(uniquePath, opts.buffer, {
    access: "public",
    contentType: opts.contentType || "application/pdf",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { url: blob.url, pathname: uniquePath };
}
