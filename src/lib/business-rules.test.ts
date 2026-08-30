import assert from "node:assert/strict";
import { isSuspiciousDisplayName, parseDisplayNameInput } from "@/lib/display-name";
import { BUSINESS, findTutorCtaCopy } from "@/lib/business-rules";
import { computeDesiredTutorPublicActive } from "@/lib/tutor-public-eligibility";

assert.equal(isSuspiciousDisplayName("★★★★★"), true);
assert.equal(isSuspiciousDisplayName("http://spam.com"), true);
assert.equal(isSuspiciousDisplayName("!!!!@@@@"), true);
assert.equal(isSuspiciousDisplayName("Ayesha Khan"), false);
assert.equal(isSuspiciousDisplayName("محمد أحمد"), false);
assert.equal(isSuspiciousDisplayName("José García"), false);

// Exact production obfuscation regression
const DON_OBFUSCATED = "Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*";
assert.equal(isSuspiciousDisplayName(DON_OBFUSCATED), true);

// International / script-safe names must remain accepted
assert.equal(isSuspiciousDisplayName("Sara Ahmed"), false);
assert.equal(isSuspiciousDisplayName("محمد أحمد"), false); // Arabic/Urdu
assert.equal(isSuspiciousDisplayName("王小明"), false); // Chinese
assert.equal(isSuspiciousDisplayName("山田太郎"), false); // Japanese (Kanji)
assert.equal(isSuspiciousDisplayName("やまだ たろう"), false); // Japanese Hiragana
assert.equal(isSuspiciousDisplayName("김민수"), false); // Korean
assert.equal(isSuspiciousDisplayName("Иван Петров"), false); // Cyrillic
assert.equal(isSuspiciousDisplayName("François Müller"), false); // accented Latin
assert.equal(isSuspiciousDisplayName("John 王"), false); // spaced bilingual OK

// Obfuscation / decorative mixes
assert.equal(isSuspiciousDisplayName("Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*"), true);
assert.equal(isSuspiciousDisplayName("Ｔｕｔｏｒ"), true); // fullwidth Latin
assert.equal(isSuspiciousDisplayName("Pаypаl Tutor"), true); // Latin + Cyrillic homoglyphs in token

const bad = parseDisplayNameInput("www.spam.com tutor");
assert.equal(bad.ok, false);

const good = parseDisplayNameInput("Sara Ahmed");
assert.equal(good.ok, true);

const rejectedDon = parseDisplayNameInput(DON_OBFUSCATED);
assert.equal(rejectedDon.ok, false);

assert.equal(BUSINESS.studentFreeContactsPerMonth, 3);
assert.ok(findTutorCtaCopy("Business").includes("3 new tutors"));
assert.ok(!findTutorCtaCopy("Business").includes("message with Student Pass"));

const base = {
  name: "Sara Ahmed",
  photoUrl: "https://example.com/photo.jpg",
  headline: "A Level Chemistry specialist",
  bio: "I help students prepare for A Level Chemistry with past papers and weekly homework plans.",
  country: "United Kingdom",
  location: "London",
  subjects: "Chemistry",
  hourlyRate: 2500,
  hasValidTeachingProfile: true,
  hasValidListingRate: true,
  online: true,
  inPerson: false,
  qualifications: "MSc Chemistry",
  emailVerified: new Date(),
  forceActive: false,
};

{
  const a = computeDesiredTutorPublicActive({ ...base, name: DON_OBFUSCATED });
  assert.equal(a.suspiciousName, true);
  assert.equal(a.desiredActive, false);
  assert.equal(a.listable, false);
}

console.log("display-name + business-rules tests: ok");
