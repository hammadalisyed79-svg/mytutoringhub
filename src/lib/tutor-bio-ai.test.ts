import assert from "node:assert/strict";
import { DEFAULT_TUTOR_BIO, isDefaultTutorBio } from "./tutor-listing-copy";
import {
  AI_TUTOR_BIO_SYSTEM,
  AI_TEACHING_DESCRIPTION_SYSTEM,
  buildTutorBioUserMessage,
  effectiveTutorBioForAi,
  formatTeachingListingFacts,
  formatTutorBioFacts,
  mergeTutorBioFacts,
  resolveTutorBioAiMode,
  sanitizeGeneratedBio,
  summarizeTeachingCapabilities,
  tutorCopyAiSystemPrompt,
} from "./tutor-bio-ai";
import { tutorQualificationOptions } from "./tutor-catalog";

assert.equal(isDefaultTutorBio(""), true);
assert.equal(isDefaultTutorBio(DEFAULT_TUTOR_BIO), true);
assert.equal(isDefaultTutorBio("New tutor — update your profile in the dashboard."), true);
assert.equal(isDefaultTutorBio("New tutor - update this profile."), true);
assert.equal(isDefaultTutorBio("I teach Maths with weekly past-paper practice."), false);

assert.equal(effectiveTutorBioForAi(DEFAULT_TUTOR_BIO), "");
assert.equal(effectiveTutorBioForAi("  New tutor — update your profile in the dashboard.  "), "");
assert.equal(
  effectiveTutorBioForAi("I help GCSE students with clear weekly plans."),
  "I help GCSE students with clear weekly plans.",
);

assert.equal(resolveTutorBioAiMode("improve", DEFAULT_TUTOR_BIO), "generate");
assert.equal(resolveTutorBioAiMode("improve", "   "), "generate");
assert.equal(
  resolveTutorBioAiMode("improve", "I teach Chemistry with past papers and weekly homework."),
  "improve",
);
assert.equal(resolveTutorBioAiMode("generate", "I already wrote a bio."), "generate");

const merged = mergeTutorBioFacts(
  { name: "Mark Elison", subjects: ["Maths"], notes: "Exam technique" },
  {
    name: "Old Name",
    subjects: "Physics",
    country: "Pakistan",
    location: "Lahore",
    qualifications: "MSc Chemistry",
    experienceYears: 8,
  },
);
assert.equal(merged.name, "Mark Elison");
assert.deepEqual(merged.subjects, ["Maths", "Physics"]);
assert.equal(merged.location, "Lahore");
assert.equal(merged.qualifications, "MSc Chemistry");
assert.equal(merged.experienceYears, 8);
assert.equal(merged.notes, "Exam technique");

const zeroYears = mergeTutorBioFacts({ experienceYears: 0 }, { experienceYears: 0 });
assert.equal(zeroYears.experienceYears, null);

const facts = formatTutorBioFacts({
  name: "Mark Elison",
  subjects: ["Mathematics"],
  location: "Lahore",
  country: "Pakistan",
});
assert.match(facts, /Name: Mark Elison/);
assert.match(facts, /Subjects: Mathematics/);
assert.doesNotMatch(facts, /10\+|hundreds|reviews/i);
assert.doesNotMatch(facts, /Years of experience/);

const listingLine = formatTeachingListingFacts([
  { subject: "Chemistry", level: "O Level", board: "Cambridge", syllabusCode: "5070" },
  { subject: "Chemistry", level: "O Level", board: "Cambridge", syllabusCode: "5070" },
]);
assert.equal(listingLine, "Chemistry · O Level · Cambridge · 5070");

const generatePrompt = buildTutorBioUserMessage({
  mode: "improve",
  facts: { name: "Mark Elison" },
  existingBio: DEFAULT_TUTOR_BIO,
});
assert.match(generatePrompt, /Mode: generate/);
assert.match(generatePrompt, /\(none — write a starter\)/);
assert.doesNotMatch(generatePrompt, /New tutor/);

const improvePrompt = buildTutorBioUserMessage({
  mode: "improve",
  facts: { name: "Mark Elison", subjects: "Biology" },
  existingBio: "I explain Biology simply and use past papers.",
});
assert.match(improvePrompt, /Mode: improve/);
assert.match(improvePrompt, /I explain Biology simply/);
assert.match(improvePrompt, /Do not add credentials/);

const freshPrompt = buildTutorBioUserMessage({
  mode: "generate",
  facts: { name: "Mark Elison" },
  existingBio: "I explain Biology simply and use past papers.",
});
assert.match(freshPrompt, /Mode: generate/);
assert.match(freshPrompt, /Ignore any placeholder seed/);
assert.doesNotMatch(freshPrompt, /I explain Biology simply/);

assert.match(AI_TUTOR_BIO_SYSTEM, /NEVER invent/i);
assert.match(AI_TUTOR_BIO_SYSTEM, /reviews/);
assert.match(AI_TUTOR_BIO_SYSTEM, /student counts/);
assert.match(AI_TUTOR_BIO_SYSTEM, /qualifications/);

assert.equal(tutorCopyAiSystemPrompt("bio"), AI_TUTOR_BIO_SYSTEM);
assert.equal(tutorCopyAiSystemPrompt("teachingDescription"), AI_TEACHING_DESCRIPTION_SYSTEM);
assert.match(AI_TEACHING_DESCRIPTION_SYSTEM, /THIS subject/);
assert.match(AI_TEACHING_DESCRIPTION_SYSTEM, /Stay between 20 and 4000/);
assert.match(AI_TEACHING_DESCRIPTION_SYSTEM, /NEVER dump a raw list of syllabus codes/);

const fewCaps = summarizeTeachingCapabilities({
  subject: "Business",
  hourlyRateLabel: "25 GBP/hr",
  online: true,
  inPerson: false,
  levels: ["GCSE", "A Level"],
  boards: ["Cambridge", "Edexcel"],
  qualificationStages: ["IGCSE", "A Level"],
  syllabusCodes: ["CAIE-IGCSE-BUS", "9709"],
});
assert.match(fewCaps, /Subject: Business/);
assert.match(fewCaps, /25 GBP\/hr/);
assert.match(fewCaps, /Online/);
assert.match(fewCaps, /mention each.*GCSE, A Level/);
assert.match(fewCaps, /mention each.*Cambridge, Edexcel/);
assert.match(fewCaps, /IGCSE/);
assert.match(fewCaps, /CAIE-IGCSE-BUS/);

const slashLevel = summarizeTeachingCapabilities({
  subject: "Mathematics",
  levels: ["FSc / HSSC / Intermediate", "A Level"],
});
assert.match(slashLevel, /FSc \/ HSSC \/ Intermediate/);
assert.doesNotMatch(slashLevel, /^Levels \(mention each\): FSc$/m);

const manyCodes = Array.from({ length: 40 }, (_, i) =>
  i < 20 ? `CAIE-IGCSE-BUS${i}` : `EDX-AL-BUS${i}`,
);
const manyCaps = summarizeTeachingCapabilities({
  subject: "Business",
  boards: ["Cambridge", "Edexcel", "AQA", "OCR", "IB", "CBSE", "FBISE"],
  syllabusCodes: manyCodes,
});
assert.match(manyCaps, /group — do not list every chip/);
assert.match(manyCaps, /40 selected — group, do not dump/);
assert.match(manyCaps, /Cambridge/);
assert.match(manyCaps, /Edexcel/);
assert.match(manyCaps, /Distinctive codes you may name \(max 4\)/);
assert.doesNotMatch(manyCaps, /CAIE-IGCSE-BUS19/);
assert.ok(!manyCodes.every((code) => manyCaps.includes(code)));

const teachingPrompt = buildTutorBioUserMessage({
  mode: "generate",
  purpose: "teachingDescription",
  facts: {
    name: "Zain Ali",
    subjects: ["Mathematics"],
    hourlyRateLabel: "40 GBP/hr",
    online: true,
    levels: "A Level",
    boards: "Cambridge",
    syllabusCodes: "9709",
  },
  existingBio: "",
});
assert.match(teachingPrompt, /Teaching Profile description/);
assert.match(teachingPrompt, /Capability summary/);
assert.match(teachingPrompt, /Mathematics/);
assert.match(teachingPrompt, /Cambridge/);
assert.match(teachingPrompt, /9709/);
assert.doesNotMatch(teachingPrompt, /Field: About you/);
assert.doesNotMatch(teachingPrompt, /Qualifications \(only if listed\)/);

const quals = tutorQualificationOptions(["Primary", "IB Diploma", "HSC"]);
assert.ok(quals.core.includes("IB Diploma"));
assert.ok(quals.core.includes("SAT"));
assert.ok(!quals.core.includes("Primary"));
assert.ok(!quals.core.includes("Adult learners"));
assert.ok(!quals.more.some((item) => item.toLowerCase() === "primary"));
assert.ok(!quals.more.some((item) => item.toLowerCase() === "university"));

assert.equal(
  sanitizeGeneratedBio('Here is a draft:\n"I teach Maths with clear weekly plans and past-paper practice for exam students."'),
  "I teach Maths with clear weekly plans and past-paper practice for exam students.",
);
assert.equal(sanitizeGeneratedBio("```\nHello students I tutor Maths.\n```"), "Hello students I tutor Maths.");
assert.equal(sanitizeGeneratedBio(DEFAULT_TUTOR_BIO), "");
assert.ok(sanitizeGeneratedBio("x".repeat(4100)).length <= 4000);

console.log("tutor-bio-ai.test.ts: ok");
