import { parseCambridgeFilename } from "../cambridge-filename-parser";
import { validatePdfBuffer } from "../file-validate";
import type { AvailableFileRef, SourceAdapter } from "../types";

export const manualUploadAdapter: SourceAdapter = {
  id: "MANUAL_UPLOAD",
  label: "Manual / bulk file upload",
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
    if (!ref.bytes) {
      return {
        ok: false,
        status: "INVALID",
        error: "No file bytes provided",
        originalFilename: ref.filename,
      };
    }
    return validatePdfBuffer(Buffer.from(ref.bytes), ref.filename, ref.mimeType);
  },
  validateFile(buffer, filename, mimeType) {
    return validatePdfBuffer(buffer, filename, mimeType);
  },
};
