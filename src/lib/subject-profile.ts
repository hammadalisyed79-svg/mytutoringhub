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
