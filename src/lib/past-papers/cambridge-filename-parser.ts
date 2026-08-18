import { CAMBRIDGE_SESSIONS, type ParseMetadataResult, type PastPaperDocumentType } from "./types";
import { CAMBRIDGE_TYPE_CODES } from "./constants";

const FILENAME_RE =
  /^([0-9]{4})_([msw])(\d{2})_([a-z]{2})(?:_([a-z0-9]+))?(?:_([a-z0-9]+))?\.pdf$/i;

export function normalizeCambridgeSession(raw?: string | null) {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "m" || value.includes("feb") || value.includes("mar")) return CAMBRIDGE_SESSIONS.m.label;
  if (value === "s" || value.includes("may") || value.includes("jun")) return CAMBRIDGE_SESSIONS.s.label;
  if (value === "w" || value.includes("oct") || value.includes("nov")) return CAMBRIDGE_SESSIONS.w.label;
  return raw!.trim();
}

function basename(filename: string) {
  return filename.replace(/\\/g, "/").split("/").pop()?.trim() || filename.trim();
}

function expandYear(yy: number) {
  return yy >= 90 ? 1900 + yy : 2000 + yy;
}

export function parseCambridgeFilename(filename: string): ParseMetadataResult {
  const originalFilename = basename(filename);
  if (!originalFilename) {
    return { ok: false, status: "INVALID", error: "Empty filename", originalFilename: filename };
  }
  if (/\.\.|[<>:"|?*]/.test(originalFilename) || originalFilename.includes("\0")) {
    return {
      ok: false,
      status: "INVALID",
      error: "Unsafe filename",
      originalFilename,
    };
  }

  const match = originalFilename.match(FILENAME_RE);
  if (!match) {
    return {
      ok: false,
      status: "REQUIRES_REVIEW",
      error: "Filename does not match Cambridge pattern (e.g. 0620_s24_qp_42.pdf)",
      originalFilename,
    };
  }

  const syllabusCode = match[1];
  const sessionCode = match[2].toLowerCase() as keyof typeof CAMBRIDGE_SESSIONS;
  const year = expandYear(Number(match[3]));
  const typeCode = match[4].toLowerCase();
  const componentCode = match[5] || "";
  const extra = match[6] || null;
  const session = CAMBRIDGE_SESSIONS[sessionCode];
  const documentType = (CAMBRIDGE_TYPE_CODES[typeCode] || "OTHER") as PastPaperDocumentType;
  const notes: string[] = [];
  let confidence: "ok" | "review" = "ok";

  if (!session) {
    return {
      ok: false,
      status: "REQUIRES_REVIEW",
      error: `Unknown session code “${match[2]}”`,
      originalFilename,
    };
  }
  if (year < 1990 || year > 2035) {
    return {
      ok: false,
      status: "REQUIRES_REVIEW",
      error: `Year ${year} is out of range`,
      originalFilename,
    };
  }
  if (!CAMBRIDGE_TYPE_CODES[typeCode]) {
    notes.push(`Unknown paper type code “${typeCode}”`);
    confidence = "review";
  }
  if (typeCode === "gt") {
    notes.push("Grade threshold mapped to OTHER");
  }
  if (extra) {
    notes.push(`Extra suffix “${extra}” needs review`);
    confidence = "review";
  }

  const paperNumber = componentCode && /^\d/.test(componentCode) ? componentCode[0] : componentCode;
  const variant =
    extra || (/^\d{2}$/.test(componentCode) ? componentCode[1] : null);

  return {
    ok: true,
    metadata: {
      syllabusCode,
      sessionCode,
      sessionLabel: session.label,
      year,
      typeCode,
      documentType,
      componentCode,
      paperNumber,
      variant,
      originalFilename,
      confidence,
      notes,
    },
  };
}
