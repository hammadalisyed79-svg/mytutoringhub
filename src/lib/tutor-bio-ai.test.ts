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
  tutorCopyAiSystemPrompt,
} from "./tutor-bio-ai";

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

const teachingPrompt = buildTutorBioUserMessage({
  mode: "generate",
  purpose: "teachingDescription",
  facts: { name: "Zain Ali", subjects: ["Mathematics"], listings: "Mathematics · A Level · Cambridge · 9709" },
  existingBio: "",
});
assert.match(teachingPrompt, /Teaching Profile description/);
assert.match(teachingPrompt, /Mathematics · A Level · Cambridge · 9709/);
assert.doesNotMatch(teachingPrompt, /Field: About you/);

assert.equal(
  sanitizeGeneratedBio('Here is a draft:\n"I teach Maths with clear weekly plans and past-paper practice for exam students."'),
  "I teach Maths with clear weekly plans and past-paper practice for exam students.",
);
assert.equal(sanitizeGeneratedBio("```\nHello students I tutor Maths.\n```"), "Hello students I tutor Maths.");
assert.equal(sanitizeGeneratedBio(DEFAULT_TUTOR_BIO), "");
assert.ok(sanitizeGeneratedBio("x".repeat(4100)).length <= 4000);

console.log("tutor-bio-ai.test.ts: ok");
