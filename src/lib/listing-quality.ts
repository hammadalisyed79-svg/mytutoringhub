/**
 * Explainable teaching-listing quality score.
 * Never rewrites tutor copy — tips only.
 * Bands: Strong (≥75), Good (≥65), Needs improvement (<65).
 */

export type ListingQualityBand = "Strong" | "Good" | "Needs improvement";

export type ListingQualityInput = {
  subject: string;
  title: string;
  headline?: string | null;
  description?: string | null;
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
  levels?: string[] | null;
  boards?: string[] | null;
  qualifications?: string[] | null;
  syllabusCodes?: string[] | null;
  location?: string | null;
  rate?: number | null;
  online?: boolean;
  inPerson?: boolean;
};

export type ListingQualityResult = {
  score: number;
  band: ListingQualityBand;
  tips: string[];
  strengths: string[];
};

const WEAK_DESCRIPTION =
  /new tutor|update your profile|excellent in teaching|vide range|lorem ipsum/i;

export function scoreListingQuality(listing: ListingQualityInput): ListingQualityResult {
  let score = 0;
  const tips: string[] = [];
  const strengths: string[] = [];

  const subject = (listing.subject || "").trim();
  const title = (listing.title || "").trim();
  const headline = (listing.headline || "").trim();
  const description = (listing.description || "").trim();
  const level = (listing.levels?.find(Boolean) || listing.level || "").trim();
  const board = (listing.boards?.find(Boolean) || listing.board || "").trim();
  const qualification = (listing.qualifications?.find(Boolean) || listing.qualification || "").trim();
  const syllabusCode = (listing.syllabusCodes?.find(Boolean) || listing.syllabusCode || "").trim();
  const location = (listing.location || "").trim();
  const rate = listing.rate ?? 0;

  if (subject && subject.toLowerCase() !== "general") {
    score += 15;
    strengths.push("Clear subject");
  } else {
    tips.push("Use a specific subject students search for (e.g. Mathematics, not General).");
  }

  if (title.length >= 12 && !/all levels computer/i.test(title)) {
    score += 10;
  } else {
    tips.push("Write a specific title (e.g. “Cambridge O Level Chemistry 5070”).");
  }

  if (board) {
    score += 18;
    strengths.push("Exam board set");
  } else {
    tips.push("Add exam board when relevant — Past Paper visitors match on board.");
  }

  if (syllabusCode) {
    score += 18;
    strengths.push("Syllabus code set");
  } else {
    tips.push("Add syllabus / subject code (e.g. 0580) when you teach an exam syllabus.");
  }

  if (qualification || (level && level.toLowerCase() !== "all levels")) {
    score += 12;
    strengths.push("Level / qualification set");
  } else {
    tips.push("Set a concrete level or qualification (IGCSE, A Level, GCSE) instead of All levels when possible.");
  }

  if (description.length >= 80 && !WEAK_DESCRIPTION.test(description)) {
    score += 12;
    strengths.push("Useful description");
  } else if (!description) {
    tips.push("Add a short description of what you teach and who it’s for.");
  } else {
    tips.push("Improve the description — avoid placeholder or generic copy.");
  }

  if (headline && headline.length >= 20 && !WEAK_DESCRIPTION.test(headline)) {
    score += 5;
  }

  if (rate >= 500) {
    score += 5;
  } else {
    tips.push("Set a listing-specific hourly rate.");
  }

  if (location) {
    score += 3;
  }

  if (listing.online || listing.inPerson) {
    score += 2;
  } else {
    tips.push("Mark whether you teach online, in person, or both.");
  }

  // Bands: Strong 75+, Good 65–74, Needs improvement below 65 (mid scores are not “Good”).
  const band: ListingQualityBand =
    score >= 75 ? "Strong" : score >= 65 ? "Good" : "Needs improvement";

  return {
    score: Math.min(100, score),
    band,
    tips: tips.slice(0, 5),
    strengths: strengths.slice(0, 5),
  };
}

/** Near-duplicate: same tutor, same subject, similar level/board (not GCSE vs A Level).
 * Create/update uniqueness is canonical subject (`teaching-profile-duplicates`) — this helper
 * is not the product gate. Distinct levels of the same subject are one Teaching Profile.
 */
export function isNearDuplicateListing(
  a: { subject: string; level?: string | null; board?: string | null; title?: string | null },
  b: { subject: string; level?: string | null; board?: string | null; title?: string | null },
): { nearDup: boolean; confidence: "high" | "low"; reason: string } {
  const subjA = a.subject.trim().toLowerCase();
  const subjB = b.subject.trim().toLowerCase();
  if (subjA !== subjB) {
    return { nearDup: false, confidence: "low", reason: "different_subject" };
  }

  const levelA = (a.level || "").trim().toLowerCase();
  const levelB = (b.level || "").trim().toLowerCase();
  const boardA = (a.board || "").trim().toLowerCase();
  const boardB = (b.board || "").trim().toLowerCase();

  const distinctLevels =
    levelA &&
    levelB &&
    levelA !== levelB &&
    !(levelA === "all levels" || levelB === "all levels");
  if (distinctLevels) {
    return { nearDup: false, confidence: "high", reason: "distinct_levels_ok" };
  }

  const distinctBoards = boardA && boardB && boardA !== boardB;
  if (distinctBoards) {
    return { nearDup: false, confidence: "high", reason: "distinct_boards_ok" };
  }

  const titleA = (a.title || "").trim().toLowerCase();
  const titleB = (b.title || "").trim().toLowerCase();
  const sameTitle = titleA && titleB && titleA === titleB;
  const sameLevel = !levelA || !levelB || levelA === levelB || levelA === "all levels" || levelB === "all levels";
  const sameBoard = !boardA || !boardB || boardA === boardB;

  if (sameLevel && sameBoard) {
    return {
      nearDup: true,
      confidence: sameTitle || (!boardA && !boardB) ? "high" : "low",
      reason: "same_subject_level_board",
    };
  }

  return { nearDup: false, confidence: "low", reason: "not_near_dup" };
}
