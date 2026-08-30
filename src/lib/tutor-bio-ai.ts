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
  levels?: string | string[] | null;
  expertise?: string | null;
  listings?: string | null;
  notes?: string | null;
  hourlyRateLabel?: string | null;
  online?: boolean | null;
  inPerson?: boolean | null;
  boards?: string | string[] | null;
  qualificationStages?: string | string[] | null;
  syllabusCodes?: string | string[] | null;
  capabilitySummary?: string | null;
};

export type TeachingProfileAiInput = {
  subject?: string | null;
  hourlyRateLabel?: string | null;
  online?: boolean | null;
  inPerson?: boolean | null;
  levels?: string[];
  boards?: string[];
  qualificationStages?: string[];
  syllabusCodes?: string[];
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

Your job: a smart, specific paragraph — who this subject is for, which boards/curricula and awards you cover, how lessons run, and what students can expect.

Hard rules:
- Use ONLY facts listed under "Known profile details" (especially the capability summary) and, when improving, the tutor's existing draft plus their optional notes.
- Stay on THIS subject. Do not write a general “About you” life story or list other subjects they did not name for this profile.
- Mention the relevant capabilities in natural prose. If few items are listed, name each. If many, group by family (e.g. Cambridge IGCSE/A Level, Edexcel, AQA, IB, CBSE) — NEVER dump a raw list of syllabus codes.
- You may name at most four distinctive syllabus codes when they help Past Papers discovery. Prefer well-known numeric codes (0580, 9709) or one flagship code per family.
- NEVER invent years of experience, degrees, certificates, schools, exam results, student counts, ratings, reviews, awards, or job titles. Do not add boards, levels, or codes that are not in the summary.
- If a detail is missing, omit it. Do not guess or pad with typical tutor clichés that imply credentials ("10+ years", "hundreds of students", "top-rated").
- Do not mention My Tutoring Hub, AI, or that this text was generated.
- Write in first person.
- Aim for about 80–170 words. Stay between 20 and 4000 characters.
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
  const parts = Array.isArray(value) ? value : value.split(/[,;]+/);
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

const CODE_FAMILIES: [RegExp, string][] = [
  [/\b(caie|cie|cambridge)\b/i, "Cambridge"],
  [/\b(edx|edexcel|pearson)\b/i, "Edexcel"],
  [/\baqa\b/i, "AQA"],
  [/\bib\b/i, "IB"],
  [/\bcbse\b/i, "CBSE"],
  [/\bfbise\b/i, "FBISE"],
  [/\bwjec\b/i, "WJEC"],
  [/\bccea\b/i, "CCEA"],
  [/\bsqa\b/i, "SQA"],
  [/\bncea\b/i, "NCEA"],
  [/\bhkdse\b/i, "HKDSE"],
  [/\bspm\b/i, "SPM"],
  [/\bcaps\b|\bnsc\b/i, "South Africa CAPS/NSC"],
  [/\bhsc\b/i, "HSC"],
  [/\buk[-_]/i, "UK boards"],
];

function capabilityFamily(label: string) {
  const text = label.trim();
  if (!text) return "";
  for (const [pattern, name] of CODE_FAMILIES) {
    if (pattern.test(text)) return name;
  }
  const token = text.split(/[\s/_-]+/)[0];
  return token || text;
}

function joinSmart(items: string[], few = 5) {
  const list = asList(items);
  if (!list.length) return "";
  if (list.length <= few) return list.join(", ");
  return `${list.slice(0, 3).join(", ")}, and ${list.length - 3} more`;
}

function groupLabels(items: string[]) {
  const groups = new Map<string, string[]>();
  for (const item of asList(items)) {
    const family = capabilityFamily(item);
    const list = groups.get(family) || [];
    list.push(item);
    groups.set(family, list);
  }
  return groups;
}

function lessonModeLabel(online?: boolean | null, inPerson?: boolean | null) {
  if (online && inPerson) return "Online and in person";
  if (online) return "Online";
  if (inPerson) return "In person";
  return "";
}

/** Compact, grouped facts for Teaching Profile AI — never a raw dump of 40 codes. */
export function summarizeTeachingCapabilities(input: TeachingProfileAiInput) {
  const lines: string[] = [];
  const subject = input.subject?.trim();
  if (subject) lines.push(`Subject: ${subject}`);
  if (input.hourlyRateLabel?.trim()) lines.push(`Hourly rate: ${input.hourlyRateLabel.trim()}`);
  const mode = lessonModeLabel(input.online, input.inPerson);
  if (mode) lines.push(`Lesson mode: ${mode}`);

  const levels = asList(input.levels);
  if (levels.length) {
    lines.push(
      levels.length <= 5
        ? `Levels (mention each): ${levels.join(", ")}`
        : `Levels (summarize): ${joinSmart(levels, 3)}`,
    );
  }

  const boards = asList(input.boards);
  if (boards.length) {
    const families = [...groupLabels(boards).keys()];
    lines.push(
      boards.length <= 6
        ? `Boards / curricula (mention each): ${boards.join(", ")}`
        : `Boards / curricula (group — do not list every chip): ${families.join(", ")} (${boards.length} selected)`,
    );
  }

  const quals = asList(input.qualificationStages);
  if (quals.length) {
    const levelSet = new Set(levels.map((item) => item.toLowerCase()));
    const distinct = quals.filter((item) => !levelSet.has(item.toLowerCase()));
    const useful = distinct.length ? distinct : quals;
    lines.push(
      useful.length <= 5
        ? `Qualification stages / awards (mention each): ${useful.join(", ")}`
        : `Qualification stages / awards (summarize): ${joinSmart(useful, 3)}`,
    );
  }

  const codes = asList(input.syllabusCodes);
  if (codes.length) {
    const groups = groupLabels(codes);
    const familyBits = [...groups.entries()].map(([family, list]) => {
      const samples = list.slice(0, 2).join(", ");
      return list.length <= 2 ? `${family} (${samples})` : `${family} (${samples}, +${list.length - 2})`;
    });
    const numeric = codes.filter((code) => /\d{3,}/.test(code));
    const distinctive = (numeric.length ? numeric : codes).slice(0, 4);
    lines.push(
      codes.length <= 6
        ? `Syllabus codes (mention each): ${codes.join(", ")}`
        : `Syllabus codes (${codes.length} selected — group, do not dump): ${familyBits.join("; ")}`,
    );
    if (codes.length > 6 && distinctive.length) {
      lines.push(`Distinctive codes you may name (max 4): ${distinctive.join(", ")}`);
    }
  }

  if (lines.length < 2) {
    lines.push("Capabilities are sparse — keep the description modest and invite students to message.");
  }
  return lines.join("\n");
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
    levels: pick(
      typeof draft.levels === "string" ? draft.levels : asList(draft.levels).join(", "),
      typeof stored.levels === "string" ? stored.levels : asList(stored.levels).join(", "),
    ),
    expertise: pick(draft.expertise, stored.expertise),
    listings: pick(draft.listings, stored.listings),
    notes: pick(draft.notes, stored.notes),
    hourlyRateLabel: pick(draft.hourlyRateLabel, stored.hourlyRateLabel),
    online: draft.online ?? stored.online ?? null,
    inPerson: draft.inPerson ?? stored.inPerson ?? null,
    boards: pick(typeof draft.boards === "string" ? draft.boards : asList(draft.boards).join(", "), typeof stored.boards === "string" ? stored.boards : asList(stored.boards).join(", ")),
    qualificationStages: pick(
      typeof draft.qualificationStages === "string" ? draft.qualificationStages : asList(draft.qualificationStages).join(", "),
      typeof stored.qualificationStages === "string" ? stored.qualificationStages : asList(stored.qualificationStages).join(", "),
    ),
    syllabusCodes: pick(
      typeof draft.syllabusCodes === "string" ? draft.syllabusCodes : asList(draft.syllabusCodes).join(", "),
      typeof stored.syllabusCodes === "string" ? stored.syllabusCodes : asList(stored.syllabusCodes).join(", "),
    ),
    capabilitySummary: pick(draft.capabilitySummary, stored.capabilitySummary),
  };
}

export function formatTutorBioFacts(facts: TutorBioFacts, purpose: TutorBioAiPurpose = "bio") {
  const subjects = asList(facts.subjects).join(", ");
  const years =
    facts.experienceYears != null && facts.experienceYears > 0
      ? String(facts.experienceYears)
      : "";
  if (purpose === "teachingDescription") {
    const summary =
      facts.capabilitySummary?.trim() ||
      summarizeTeachingCapabilities({
        subject: subjects,
        hourlyRateLabel: facts.hourlyRateLabel,
        online: facts.online,
        inPerson: facts.inPerson,
        levels: asList(facts.levels),
        boards: asList(facts.boards),
        qualificationStages: asList(facts.qualificationStages),
        syllabusCodes: asList(facts.syllabusCodes),
      });
    const lines = [
      factLine("Name", facts.name),
      factLine("Location", [facts.location, facts.country].filter((v) => v?.trim()).join(", ")),
      factLine("Capability summary (follow these grouping rules)", summary),
      factLine("Tutor notes (their own words — do not add extra credentials)", facts.notes),
    ].filter(Boolean);
    return lines.length ? lines.join("\n") : "None provided.";
  }
  const lines = [
    factLine("Name", facts.name),
    factLine("Headline", facts.headline),
    factLine("Subjects", subjects),
    factLine("Teaching listings", facts.listings),
    factLine("Levels", asList(facts.levels).join(", ")),
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
        ? "Write a new Teaching Profile description from the known details only. Ignore any placeholder seed text. Weave in the capability summary in natural sentences: who it is for, boards/curricula, awards, and at most a few codes. If details are sparse, keep it modest and invite students to message — still no invented background."
        : "Write a new starter bio from the known details only. Ignore any placeholder seed text. If details are sparse, keep it modest and invite students to message — still no invented background.";

  return [
    `Mode: ${resolved}.`,
    teaching ? "Field: Teaching Profile description (one subject)." : "Field: About you.",
    task,
    "",
    "Known profile details:",
    formatTutorBioFacts(facts, purpose),
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
