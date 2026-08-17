import { parseCambridgeFilename } from "../cambridge-filename-parser";
import { validatePdfBuffer } from "../file-validate";
import type { SourceAdapter } from "../types";

export const SourceNotEnabledError = class SourceNotEnabledError extends Error {
  constructor(source: string) {
    super(`${source} is not enabled: no permitted public API`);
    this.name = "SourceNotEnabledError";
  }
};

function notEnabled(id: SourceAdapter["id"], label: string, parse = parseCambridgeFilename): SourceAdapter {
  const reject = async (): Promise<never> => {
    throw new SourceNotEnabledError(label);
  };
  return {
    id,
    label,
    enabled: false,
    scanSubject: reject,
    getAvailableFiles: reject,
    parseMetadata: parse,
    downloadFile: reject,
    validateFile: (buffer, filename, mimeType) => validatePdfBuffer(buffer, filename, mimeType),
  };
}

export const cambridgeBoardAdapter = notEnabled("CAMBRIDGE", "Cambridge");
export const aqaAdapter = notEnabled("AQA", "AQA", (filename) => ({
  ok: false,
  status: "REQUIRES_REVIEW",
  error: "AQA filename parsing is not enabled",
  originalFilename: filename,
}));
export const pearsonAdapter = notEnabled("PEARSON", "Pearson", (filename) => ({
  ok: false,
  status: "REQUIRES_REVIEW",
  error: "Pearson filename parsing is not enabled",
  originalFilename: filename,
}));
export const cbseAdapter = notEnabled("CBSE", "CBSE", (filename) => ({
  ok: false,
  status: "REQUIRES_REVIEW",
  error: "CBSE filename parsing is not enabled",
  originalFilename: filename,
}));
export const fbiseAdapter = notEnabled("FBISE", "FBISE", (filename) => ({
  ok: false,
  status: "REQUIRES_REVIEW",
  error: "FBISE filename parsing is not enabled",
  originalFilename: filename,
}));

