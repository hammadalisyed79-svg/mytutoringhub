/**
 * Past-paper metadata quality classification + high-confidence normalization.
 * Preserves originals; never mass-deletes. Uncertain → REVIEW REQUIRED.
 * Does NOT map bare UK/SA month names (june, november) onto Cambridge May/Jun.
 */

export type QualityClass = "CLEAN" | "AUTO_FIXABLE" | "REVIEW_REQUIRED" | "BROKEN";

export const CANONICAL_SESSIONS = [
  "Feb/Mar",
  "May/Jun",
  "Oct/Nov",
  "January",
  "June",
  "October",
  "November",
] as const;

export type CanonicalSession = (typeof CANONICAL_SESSIONS)[number];

/**
 * High-confidence maps only.
 * Hyphen / slash Cambridge-style → Feb/Mar | May/Jun | Oct/Nov.
 * Bare month dumps → Title Case (board-specific terms preserved).
 */
const EXPLICIT_SESSION_MAP: Record<string, CanonicalSession> = {
  // Cambridge-style compound labels
  "may-june": "May/Jun",
  "may/june": "May/Jun",
  "may/jun": "May/Jun",
  "may june": "May/Jun",
  s: "May/Jun",
  "oct-nov": "Oct/Nov",
  "oct/nov": "Oct/Nov",
  "oct/november": "Oct/Nov",
  "october/november": "Oct/Nov",
  "oct nov": "Oct/Nov",
  w: "Oct/Nov",
  "feb-march": "Feb/Mar",
  "feb/march": "Feb/Mar",
  "feb/mar": "Feb/Mar",
  "february/march": "Feb/Mar",
  "feb mar": "Feb/Mar",
  m: "Feb/Mar",
  // Board-specific bare months → Title Case (do NOT fold into Cambridge)
  january: "January",
  jan: "January",
  june: "June",
  jun: "June",
  october: "October",
  oct: "October",
  november: "November",
  nov: "November",
};

const CANONICAL_SET = new Set(CANONICAL_SESSIONS.map((s) => s.toLowerCase()));

export function normalizeSessionKey(raw?: string | null) {
  return (raw || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * High-confidence session normalize.
 * Returns null when empty or uncertain (caller must not auto-write).
 */
export function normalizePastPaperSession(raw?: string | null): {
  canonical: string | null;
  confidence: "high" | "none";
  reason: string;
} {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return { canonical: null, confidence: "none", reason: "empty_session" };
  }

  const key = normalizeSessionKey(trimmed);
  if (CANONICAL_SET.has(key)) {
    const match = CANONICAL_SESSIONS.find((s) => s.toLowerCase() === key)!;
    return {
      canonical: match,
      confidence: "high",
      reason: match === trimmed ? "already_canonical" : "case_fix",
    };
  }

  if (EXPLICIT_SESSION_MAP[key]) {
    return {
      canonical: EXPLICIT_SESSION_MAP[key],
      confidence: "high",
      reason: "explicit_map",
    };
  }

  return { canonical: null, confidence: "none", reason: "uncertain_session" };
}

export type PaperQualityInput = {
  id?: string;
  session?: string | null;
  paperType?: string | null;
  documentType?: string | null;
  storageKey?: string | null;
  fileUrl?: string | null;
  subject?: string | null;
  board?: string | null;
  syllabusCode?: string | null;
  year?: number | null;
};

export type PaperQualityResult = {
  class: QualityClass;
  sessionCanonical: string | null;
  sessionNeedsWrite: boolean;
  flags: string[];
};

export function classifyPastPaperQuality(paper: PaperQualityInput): PaperQualityResult {
  const flags: string[] = [];
  const hasFile = Boolean(paper.storageKey || paper.fileUrl);
  if (!hasFile) flags.push("missing_file");
  if (!paper.subject?.trim()) flags.push("missing_subject");
  if (!paper.board?.trim()) flags.push("missing_board");
  if (paper.year == null || !Number.isFinite(paper.year)) flags.push("missing_year");
  if ((paper.documentType || "").toUpperCase() === "OTHER" || paper.paperType === "Other") {
    flags.push("other_document");
  }
  if (!paper.syllabusCode?.trim()) flags.push("missing_syllabus");

  if (flags.includes("missing_file") || flags.includes("missing_subject") || flags.includes("missing_board")) {
    return {
      class: "BROKEN",
      sessionCanonical: null,
      sessionNeedsWrite: false,
      flags,
    };
  }

  const sessionNorm = normalizePastPaperSession(paper.session);
  if (!paper.session?.trim()) {
    flags.push("missing_session");
    return {
      class: "REVIEW_REQUIRED",
      sessionCanonical: null,
      sessionNeedsWrite: false,
      flags,
    };
  }

  if (sessionNorm.confidence === "high" && sessionNorm.canonical) {
    const needsWrite = sessionNorm.canonical !== paper.session.trim();
    if (needsWrite) flags.push(`session_auto:${sessionNorm.reason}`);
    if (needsWrite) {
      return {
        class: "AUTO_FIXABLE",
        sessionCanonical: sessionNorm.canonical,
        sessionNeedsWrite: true,
        flags,
      };
    }
    if (flags.includes("other_document") || flags.includes("missing_syllabus")) {
      return {
        class: "REVIEW_REQUIRED",
        sessionCanonical: sessionNorm.canonical,
        sessionNeedsWrite: false,
        flags,
      };
    }
    return {
      class: "CLEAN",
      sessionCanonical: sessionNorm.canonical,
      sessionNeedsWrite: false,
      flags,
    };
  }

  flags.push(`session_uncertain:${sessionNorm.reason}`);
  return {
    class: "REVIEW_REQUIRED",
    sessionCanonical: null,
    sessionNeedsWrite: false,
    flags,
  };
}

export type QualitySummary = {
  total: number;
  clean: number;
  autoFixable: number;
  reviewRequired: number;
  broken: number;
  otherDocument: number;
  missingSession: number;
  missingFile: number;
  missingSyllabus: number;
  sessionPreview: { from: string; to: string; count: number }[];
};

export function summarizeQualityClasses(rows: PaperQualityInput[]): QualitySummary {
  const counts = {
    total: rows.length,
    clean: 0,
    autoFixable: 0,
    reviewRequired: 0,
    broken: 0,
    otherDocument: 0,
    missingSession: 0,
    missingFile: 0,
    missingSyllabus: 0,
  };
  const sessionMap = new Map<string, number>();

  for (const row of rows) {
    const result = classifyPastPaperQuality(row);
    if (result.class === "CLEAN") counts.clean += 1;
    else if (result.class === "AUTO_FIXABLE") counts.autoFixable += 1;
    else if (result.class === "REVIEW_REQUIRED") counts.reviewRequired += 1;
    else counts.broken += 1;

    if (result.flags.includes("other_document")) counts.otherDocument += 1;
    if (result.flags.includes("missing_session")) counts.missingSession += 1;
    if (result.flags.includes("missing_file")) counts.missingFile += 1;
    if (result.flags.includes("missing_syllabus")) counts.missingSyllabus += 1;

    if (result.sessionNeedsWrite && result.sessionCanonical) {
      const key = `${row.session || ""}→${result.sessionCanonical}`;
      sessionMap.set(key, (sessionMap.get(key) || 0) + 1);
    }
  }

  const sessionPreview = [...sessionMap.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("→");
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return { ...counts, sessionPreview };
}
