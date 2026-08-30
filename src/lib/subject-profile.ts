/** Helpers for SubjectProfile rows (Phase B listable subject listings). */

export function normalizeSubjectLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function splitSubjectsCsv(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,|;]+/)) {
    const subject = normalizeSubjectLabel(part);
    if (!subject) continue;
    const key = subject.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(subject);
  }
  return out;
}

export function defaultSubjectProfileTitle(subject: string, tutorName?: string | null): string {
  const name = tutorName?.trim();
  if (name) return `${name} · ${subject}`;
  return `${subject} tutor`;
}

/**
 * Public document title for `/listings/{id}`. Default titles already end with
 * ` · ${subject}` (e.g. "Zain Ali · Humanities"), so appending the subject again
 * produced "Humanities · Humanities".
 */
export function teachingProfileDocumentTitle(title: string, subject: string) {
  const t = (title || "").trim();
  const s = (subject || "").trim();
  if (!t) return s;
  if (!s) return t;
  const lowerT = t.toLowerCase();
  const lowerS = s.toLowerCase();
  if (lowerT === lowerS) return t;
  if (
    lowerT.endsWith(` · ${lowerS}`) ||
    lowerT.endsWith(` - ${lowerS}`) ||
    lowerT.endsWith(` – ${lowerS}`) ||
    lowerT.endsWith(` — ${lowerS}`)
  ) {
    return t;
  }
  return `${t} · ${s}`;
}

/** Public URL for a subject listing card. */
export function listingPath(listingId: string) {
  return `/listings/${listingId}`;
}
