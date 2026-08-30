import { isDefaultTutorBio } from "@/lib/tutor-listing-copy";

export const AI_TUTOR_BIO_KIND = "tutor-bio";
export const AI_TUTOR_BIO_RATE_LIMIT = 20;

export type TutorBioAiMode = "generate" | "improve";
export type TutorBioAiPurpose = "bio" | "teachingDescription";

export type TutorBioFacts = {
  name?: string | null;
  headline?: string | null;
  subjects?: string | string[] | null;
  location?: string | null;
  country?: string | null;
  qualifications?: string | null;
  experienceYears?: number | null;
  teachingMethod?: string | null;
  languages?: string | null;
  levels?: string | null;
  expertise?: string | null;
  listings?: string | null;
  notes?: string | null;
};

export const AI_TUTOR_BIO_SYSTEM = `You write first-person tutor profile introductions ("About you") for My Tutoring Hub.

Your job: a warm, professional, honest bio students can trust.

Hard rules:
- Use ONLY facts listed under "Known profile details" and, when improving, the tutor's existing draft plus their optional notes.
- NEVER invent years of experience, qualifications, degrees, certificates, schools, exam results, student counts, ratings, reviews, awards, or job titles.
- If a detail is missing, omit it. Do not guess or pad with typical tutor clichés that imply credentials ("10+ years", "hundreds of students", "top-rated").
- Do not mention My Tutoring Hub, AI, or that this text was generated.
- Write in first person. Be specific about how lessons run when the facts allow (subjects, levels, location, teaching method).
- Aim for about 90–180 words. Stay between 80 and 4000 characters.
- Output the bio only — no title, quotes, markdown, or preamble.`;

export const AI_TEACHING_DESCRIPTION_SYSTEM = `You write first-person Teaching Profile descriptions for one subject on My Tutoring Hub.

Your job: say who this subject is for, how the tutor teaches it, and what students can expect.

Hard rules:
- Use ONLY facts listed under "Known profile details" and, when improving, the tutor's existing draft plus their optional notes.
- Stay on THIS subject (and the boards, levels, qualifications, or syllabus codes listed). Do not write a general “About you” life story or list other subjects they did not name for this profile.
- NEVER invent years of experience, qualifications, degrees, certificates, schools, exam results, student counts, ratings, reviews, awards, or job titles.
- If a detail is missing, omit it. Do not guess or pad with typical tutor clichés that imply credentials ("10+ years", "hundreds of students", "top-rated").
- Do not mention My Tutoring Hub, AI, or that this text was generated.
- Write in first person.
- Aim for about 70–160 words. Stay between 20 and 4000 characters.
- Output the description only — no title, quotes, markdown, or preamble.`;

export function tutorCopyAiSystemPrompt(purpose: TutorBioAiPurpose = "bio") {
  return purpose === "teachingDescription" ? AI_TEACHING_DESCRIPTION_SYSTEM : AI_TUTOR_BIO_SYSTEM;
}

export function effectiveTutorBioForAi(bio?: string | null) {
  if (isDefaultTutorBio(bio)) return "";
  return bio?.trim() || "";
}

export function resolveTutorBioAiMode(
  requested: TutorBioAiMode | string | null | undefined,
  bio?: string | null,
): TutorBioAiMode {
  const mode = requested === "improve" ? "improve" : "generate";
  if (mode === "improve" && !effectiveTutorBioForAi(bio)) return "generate";
  return mode;
}

function asList(value?: string | string[] | null) {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : value.split(/[,;|/]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function factLine(label: string, value?: string | null) {
  const text = value?.trim();
  if (!text) return null;
  return `- ${label}: ${text}`;
}

export function formatTeachingListingFacts(
  listings: {
    subject?: string | null;
    title?: string | null;
    level?: string | null;
    board?: string | null;
    qualification?: string | null;
    syllabusCode?: string | null;
  }[],
) {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const row of listings) {
    const bits = [
      row.subject,
      row.level && row.level.trim() !== "All levels" ? row.level : "",
      row.board,
      row.qualification,
      row.syllabusCode,
    ]
      .map((bit) => bit?.trim() || "")
      .filter(Boolean);
    const line = bits.join(" · ");
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return lines.join("; ");
}

export function mergeTutorBioFacts(draft: TutorBioFacts, stored: TutorBioFacts): TutorBioFacts {
  const pick = (a?: string | null, b?: string | null) => {
    const first = a?.trim();
    if (first) return first;
    return b?.trim() || "";
  };
  const subjects = asList([...(asList(draft.subjects)), ...(asList(stored.subjects))]);
  const years =
    draft.experienceYears != null && Number.isFinite(draft.experienceYears)
      ? draft.experienceYears
      : stored.experienceYears != null && Number.isFinite(stored.experienceYears)
        ? stored.experienceYears
        : null;
  return {
    name: pick(draft.name, stored.name),
    headline: pick(draft.headline, stored.headline),
    subjects,
    location: pick(draft.location, stored.location),
    country: pick(draft.country, stored.country),
    qualifications: pick(draft.qualifications, stored.qualifications),
    experienceYears: years != null && years > 0 ? years : null,
    teachingMethod: pick(draft.teachingMethod, stored.teachingMethod),
    languages: pick(draft.languages, stored.languages),
    levels: pick(draft.levels, stored.levels),
    expertise: pick(draft.expertise, stored.expertise),
    listings: pick(draft.listings, stored.listings),
    notes: pick(draft.notes, stored.notes),
  };
}

export function formatTutorBioFacts(facts: TutorBioFacts) {
  const subjects = asList(facts.subjects).join(", ");
  const years =
    facts.experienceYears != null && facts.experienceYears > 0
      ? String(facts.experienceYears)
      : "";
  const lines = [
    factLine("Name", facts.name),
    factLine("Headline", facts.headline),
    factLine("Subjects", subjects),
    factLine("Teaching listings", facts.listings),
    factLine("Levels", facts.levels),
    factLine("Location", [facts.location, facts.country].filter((v) => v?.trim()).join(", ")),
    factLine("Qualifications (only if listed)", facts.qualifications),
    factLine("Years of experience (only if listed)", years),
    factLine("Teaching method", facts.teachingMethod),
    factLine("Languages", facts.languages),
    factLine("Expertise", facts.expertise),
    factLine("Tutor notes (their own words — do not add extra credentials)", facts.notes),
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "None provided.";
}

export function buildTutorBioUserMessage({
  mode,
  facts,
  existingBio,
  purpose = "bio",
}: {
  mode: TutorBioAiMode;
  facts: TutorBioFacts;
  existingBio?: string | null;
  purpose?: TutorBioAiPurpose;
}) {
  const incoming = effectiveTutorBioForAi(existingBio);
  const resolved = resolveTutorBioAiMode(mode, incoming);
  const draft = resolved === "improve" ? incoming : "";
  const teaching = purpose === "teachingDescription";
  const task =
    resolved === "improve"
      ? teaching
        ? "Improve the existing Teaching Profile description: clearer and easier for students to scan. Keep the tutor's meaning. Stay on this subject. Do not add credentials, results, or stats they did not mention."
        : "Improve the existing draft: clearer, warmer, and easier for students to scan. Keep the tutor's meaning. Do not add credentials, results, or stats they did not mention."
      : teaching
        ? "Write a new Teaching Profile description from the known details only. Ignore any placeholder seed text. Focus on this subject and listed boards/levels/codes. If details are sparse, keep it modest and invite students to message — still no invented background."
        : "Write a new starter bio from the known details only. Ignore any placeholder seed text. If details are sparse, keep it modest and invite students to message — still no invented background.";

  return [
    `Mode: ${resolved}.`,
    teaching ? "Field: Teaching Profile description (one subject)." : "Field: About you.",
    task,
    "",
    "Known profile details:",
    formatTutorBioFacts(facts),
    "",
    "Existing draft:",
    draft || "(none — write a starter)",
  ].join("\n");
}

export function sanitizeGeneratedBio(raw: string) {
  let text = raw.replace(/\u0000/g, "").trim();
  text = text.replace(/^```(?:[a-z]+)?\s*/i, "").replace(/\s*```$/i, "").trim();
  text = text.replace(
    /^(here(?:'s| is)|sure[,.]?|absolutely[,.]?|of course[,.]?)\s*(a |your |the )?(draft|bio|introduction|version|about you)[:\s—–-]*/i,
    "",
  ).trim();
  const quotePairs: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
  ];
  for (const [open, close] of quotePairs) {
    if (text.startsWith(open) && text.endsWith(close) && text.length > 2) {
      text = text.slice(open.length, -close.length).trim();
    }
  }
  if (text.length > 4000) text = text.slice(0, 4000).trim();
  if (isDefaultTutorBio(text)) return "";
  return text;
}
