/**
 * Past Papers → Find a tutor. Capability filters (board / level / syllabus code)
 * must land on Teaching Profile search, not a keyword bag.
 */

export type PastPaperTutorSearchInput = {
  subject: string;
  board?: string | null;
  level?: string | null;
  syllabusCode?: string | null;
  country?: string | null;
  location?: string | null;
};

export function pastPaperTutorSearchParams(input: PastPaperTutorSearchInput): URLSearchParams {
  const search = new URLSearchParams();
  const subject = (input.subject || "").trim();
  if (subject) search.set("subject", subject);
  const board = (input.board || "").trim();
  if (board) search.set("board", board);
  const level = (input.level || "").trim();
  if (level) search.set("level", level);
  const syllabusCode = (input.syllabusCode || "").trim();
  if (syllabusCode) search.set("syllabusCode", syllabusCode);
  const country = (input.country || "").trim();
  if (country) search.set("country", country);
  const location = (input.location || "").trim();
  if (location) search.set("location", location);
  return search;
}

export function pastPaperTutorSearchHref(input: PastPaperTutorSearchInput): string {
  const qs = pastPaperTutorSearchParams(input).toString();
  return qs ? `/search?${qs}` : "/search";
}
