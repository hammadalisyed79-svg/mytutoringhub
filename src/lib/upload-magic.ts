const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47] as const;
const GIF_MAGIC = [0x47, 0x49, 0x46] as const;
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50] as const;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const; // %PDF

function startsWith(buffer: Buffer, magic: readonly number[]) {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

/** Reject mismatched content-type vs file header for uploads. */
export function validateUploadMagicBytes(buffer: Buffer, contentType: string): boolean {
  if (contentType === "application/pdf") {
    return startsWith(buffer, PDF_MAGIC);
  }
  if (contentType === "image/jpeg") {
    return startsWith(buffer, JPEG_MAGIC);
  }
  if (contentType === "image/png") {
    return startsWith(buffer, PNG_MAGIC);
  }
  if (contentType === "image/gif") {
    return startsWith(buffer, GIF_MAGIC);
  }
  if (contentType === "image/webp") {
    return (
      startsWith(buffer, WEBP_RIFF) &&
      buffer.length >= 12 &&
      WEBP_TAG.every((byte, i) => buffer[8 + i] === byte)
    );
  }
  return false;
}
