export const MAX_PAST_PAPER_BYTES = 12 * 1024 * 1024;
export const MAX_CONCURRENT_DOWNLOADS = 3;
export const DOWNLOAD_DELAY_MS = 250;
export const URL_FETCH_TIMEOUT_MS = 20_000;
export const PDF_MAGIC = "%PDF";

/** Third-party exam-paper libraries — never fetch, even if an admin pastes a URL. */
export const BLOCKED_PAPER_HOSTS = [
  "savemyexams.com",
  "papacambridge.com",
  "xtremepapers.com",
  "xtremepapers.net",
  "xtremepape.rs",
  "physicsandmathstutor.com",
  "pmt.physicsandmathstutor.com",
  "gceguide.com",
  "gceguide.net",
  "igcse.net",
  "pastpapers.co",
  "freeexampapers.com",
  "dynamicpapers.com",
  "bestexamhelp.com",
  "cie-paper.com",
];

export const EXECUTABLE_EXTENSIONS = [
  ".exe",
  ".js",
  ".mjs",
  ".cjs",
  ".html",
  ".htm",
  ".bat",
  ".cmd",
  ".sh",
  ".msi",
  ".dll",
  ".com",
  ".scr",
  ".ps1",
  ".vbs",
  ".jar",
  ".wasm",
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  QUESTION_PAPER: "Question paper",
  MARK_SCHEME: "Marking scheme",
  EXAMINER_REPORT: "Examiner report",
  INSERT: "Insert",
  SOURCE_BOOKLET: "Source booklet",
  FORMULA_SHEET: "Formula sheet",
  LISTENING_AUDIO: "Listening audio",
  TRANSCRIPT: "Transcript",
  SPECIMEN_PAPER: "Specimen paper",
  SPECIMEN_MARK_SCHEME: "Specimen mark scheme",
  OTHER: "Other",
};

export const CAMBRIDGE_TYPE_CODES: Record<string, string> = {
  qp: "QUESTION_PAPER",
  ms: "MARK_SCHEME",
  er: "EXAMINER_REPORT",
  in: "INSERT",
  sf: "SOURCE_BOOKLET",
  gt: "OTHER",
  ci: "OTHER",
  tr: "TRANSCRIPT",
  ir: "OTHER",
};

export const PHASE1_SYLLABUS_CODE = "0620";
export const PHASE1_YEAR_FROM = 2016;
export const PHASE1_YEAR_TO = 2025;
export const DEFAULT_R2_PREFIX = "cambridge/igcse/chemistry/0620/";
export const R2_MANIFEST_SOURCE = "R2_MANIFEST";
export const SIGNED_GET_TTL_SECONDS = 60;

/**
 * Official Cambridge syllabus codes → curriculum subject/level.
 * curriculum.json stores codes like CIGC-IGCSE-CHEM, not 0620.
 */
export const CAMBRIDGE_SYLLABUS_MAP: Record<string, { subject: string; level: string }> = {
  "0610": { subject: "Biology", level: "IGCSE" },
  "0620": { subject: "Chemistry", level: "IGCSE" },
  "0625": { subject: "Physics", level: "IGCSE" },
  "0580": { subject: "Mathematics", level: "IGCSE" },
  "0478": { subject: "Computer Science", level: "IGCSE" },
  "0455": { subject: "Economics", level: "IGCSE" },
  "0450": { subject: "Business", level: "IGCSE" },
  "0500": { subject: "English", level: "IGCSE" },
  "0510": { subject: "English", level: "IGCSE" },
  "0511": { subject: "English", level: "IGCSE" },
  "5090": { subject: "Biology", level: "O Level" },
  "5070": { subject: "Chemistry", level: "O Level" },
  "5054": { subject: "Physics", level: "O Level" },
  "4024": { subject: "Mathematics", level: "O Level" },
  "2210": { subject: "Computer Science", level: "O Level" },
  "2281": { subject: "Economics", level: "O Level" },
  "7115": { subject: "Business", level: "O Level" },
  "9700": { subject: "Biology", level: "A Level" },
  "9701": { subject: "Chemistry", level: "A Level" },
  "9702": { subject: "Physics", level: "A Level" },
  "9709": { subject: "Mathematics", level: "A Level" },
  "9618": { subject: "Computer Science", level: "A Level" },
  "9708": { subject: "Economics", level: "A Level" },
  "9609": { subject: "Business", level: "A Level" },
};
