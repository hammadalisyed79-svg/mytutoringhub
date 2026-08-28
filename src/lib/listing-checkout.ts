/** Bind Boost / Highlight purchases to a single SubjectProfile via subscription.notes. */

export const SUBJECT_PROFILE_NOTE_KEY = "subjectProfileId";

export function encodeSubjectProfileNote(subjectProfileId: string): string {
  return `${SUBJECT_PROFILE_NOTE_KEY}=${subjectProfileId}`;
}

export function parseSubjectProfileIdFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed) as { subjectProfileId?: unknown };
      if (typeof parsed.subjectProfileId === "string" && parsed.subjectProfileId.trim()) {
        return parsed.subjectProfileId.trim();
      }
    }
  } catch {
    // fall through to key=value form
  }
  const match = trimmed.match(/(?:^|\s|;|,)subjectProfileId=([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}
