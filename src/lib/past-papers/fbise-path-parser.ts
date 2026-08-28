import { CURRICULUM } from "@/lib/curriculum";
import { basenameSafe } from "./file-validate";
import { documentTypeLabel } from "./stored-filename";

const SUBJECT_FROM_SLUG: Record<string, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  "computer-science": "Computer Science",
  computerscience: "Computer Science",
  cs: "Computer Science",
  english: "English",
  mathematics: "Mathematics",
  math: "Mathematics",
  maths: "Mathematics",
  physics: "Physics",
  urdu: "Urdu",
  islamiyat: "Islamiyat",
  "pakistan-studies": "Pakistan Studies",
};

const DOC_TYPE_FROM_SEGMENT: Record<string, string> = {
  qp: "QUESTION_PAPER",
  ms: "MARK_SCHEME",
  er: "EXAMINER_REPORT",
  in: "INSERT",
  other: "OTHER",
};

function titleFromSlug(slug: string) {
  const key = slug.toLowerCase().replace(/_/g, "-");
  if (SUBJECT_FROM_SLUG[key]) return SUBJECT_FROM_SLUG[key];
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function qualificationFromSegment(segment: string) {
  const value = segment.toLowerCase();
  if (value === "ssc") return "SSC";
  if (value === "hssc") return "HSSC";
  return segment.toUpperCase();
}

function sessionFromSegment(segment: string) {
  const value = segment.toLowerCase();
  if (!value || value === "unknown-session") return null;
  if (value.includes("feb") || value.includes("mar")) return "Feb/Mar";
  if (value.includes("may") || value.includes("jun")) return "May/Jun";
  if (value.includes("oct") || value.includes("nov")) return "Oct/Nov";
  return segment.replace(/-/g, " ");
}

function yearFromSegment(segment: string) {
  const value = segment.toLowerCase();
  if (!value || value === "unknown-year") return 0;
  const year = Number(value);
  return Number.isFinite(year) && year >= 1990 && year <= 2035 ? year : 0;
}

function curriculumCodeForFbise(qualification: string, subject: string) {
  const qualToken = qualification === "SSC" ? "SSC" : "HSSC";
  const subjectToken = subject
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
  const direct = `FBISE-${qualToken}-${subjectToken}`;
  const match =
    CURRICULUM.find(
      (row) =>
        row.country === "Pakistan" &&
        row.board === "FBISE" &&
        row.subject.toLowerCase() === subject.toLowerCase() &&
        (row.level === qualification || row.level === "Matric" || row.level === "Intermediate"),
    ) || CURRICULUM.find((row) => row.code === direct);
  return match?.code || direct;
}

export type FbiseParsedPaper = {
  storageKey: string;
  fileSize: number;
  originalFilename: string;
  subject: string;
  board: string;
  qualification: string;
  country: string;
  curriculumCode: string;
  year: number;
  session: string | null;
  documentType: string;
  componentCode: string;
  paperNumber: string | null;
  variant: string | null;
  syllabusCode: string | null;
  paperType: string;
  title: string;
};

export function parseFbiseStoragePath(
  key: string,
  size = 0,
): { ok: true; paper: FbiseParsedPaper } | { ok: false; error: string } {
  const storageKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!storageKey.toLowerCase().startsWith("fbise/")) {
    return { ok: false, error: "Not an FBISE storage path" };
  }
  if (!storageKey.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "Not a PDF" };
  }

  const parts = storageKey.split("/").filter(Boolean);
  if (parts.length < 7) {
    return { ok: false, error: "FBISE path is too short" };
  }

  const [, qualificationSegment, subjectSlug] = parts;
  const yearSegment = parts[4] || "unknown-year";
  const sessionSegment = parts[5] || "unknown-session";
  const docSegment = parts[6] || "other";
  const originalFilename = basenameSafe(parts.slice(7).join("/") || parts[parts.length - 1] || storageKey);

  const subject = titleFromSlug(subjectSlug);
  const qualification = qualificationFromSegment(qualificationSegment);
  const year = yearFromSegment(yearSegment);
  const session = sessionFromSegment(sessionSegment);
  const documentType = DOC_TYPE_FROM_SEGMENT[docSegment.toLowerCase()] || "OTHER";
  const curriculumCode = curriculumCodeForFbise(qualification, subject);
  const paperType = documentTypeLabel(documentType);
  const title = [subject, "FBISE", year || null, session, paperType].filter(Boolean).join(" · ");

  return {
    ok: true,
    paper: {
      storageKey,
      fileSize: size,
      originalFilename,
      subject,
      board: "FBISE",
      qualification,
      country: "Pakistan",
      curriculumCode,
      year,
      session,
      documentType,
      componentCode: "",
      paperNumber: null,
      variant: null,
      syllabusCode: null,
      paperType,
      title,
    },
  };
}
