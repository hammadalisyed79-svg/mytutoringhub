import assert from "node:assert/strict";
import {
  canViewTutorProfilePublicly,
  computeDesiredTutorPublicActive,
} from "@/lib/tutor-public-eligibility";

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

// complete + verified + valid name → eligible
{
  const a = computeDesiredTutorPublicActive(base);
  assert.equal(a.desiredActive, true);
  assert.equal(a.listable, true);
  assert.equal(a.complete, true);
}

// master subjects CSV without a Teaching Profile is not listable
{
  const a = computeDesiredTutorPublicActive({
    ...base,
    hasValidTeachingProfile: false,
    hasValidListingRate: false,
  });
  assert.equal(a.listable, false);
  assert.equal(a.complete, false);
  assert.ok(a.missingRequired.includes("Teaching Profile"));
}

// incomplete + verified → not eligible
{
  const a = computeDesiredTutorPublicActive({ ...base, headline: "" });
  assert.equal(a.desiredActive, false);
  assert.ok(a.missingRequired.includes("Headline"));
}

// complete + unverified → not eligible
{
  const a = computeDesiredTutorPublicActive({ ...base, emailVerified: null });
  assert.equal(a.desiredActive, false);
  assert.ok(a.blockReasons.includes("email_unverified"));
}

// suspicious name → not eligible
{
  const a = computeDesiredTutorPublicActive({ ...base, name: "★★★★ http://spam.com" });
  assert.equal(a.desiredActive, false);
  assert.equal(a.suspiciousName, true);
}

// paid-incomplete is represented by incomplete profile (payment does not affect this helper)
{
  const a = computeDesiredTutorPublicActive({
    ...base,
    subjects: "",
    qualifications: "",
    hasValidTeachingProfile: false,
    hasValidListingRate: false,
  });
  assert.equal(a.desiredActive, false);
}

// free + complete + verified → eligible
{
  const a = computeDesiredTutorPublicActive(base);
  assert.equal(a.desiredActive, true);
}

// forceActive overrides ordinary blocks
{
  const a = computeDesiredTutorPublicActive({
    ...base,
    emailVerified: null,
    headline: "",
    forceActive: true,
  });
  assert.equal(a.desiredActive, true);
  assert.equal(a.forceActiveOverride, true);
}

// international name remains valid
{
  const a = computeDesiredTutorPublicActive({ ...base, name: "محمد أحمد" });
  assert.equal(a.suspiciousName, false);
  assert.equal(a.desiredActive, true);
}

// decorative Unicode obfuscation (production regression) → not eligible
{
  const a = computeDesiredTutorPublicActive({
    ...base,
    name: "Don*卂乃ᗪㄩ尺乂ᗪ-ㄚㄒ*",
  });
  assert.equal(a.suspiciousName, true);
  assert.equal(a.desiredActive, false);
  assert.ok(a.blockReasons.includes("suspicious_display_name"));
}

// additional international scripts remain eligible
for (const name of ["王小明", "山田太郎", "김민수", "Иван Петров", "François Müller", "John 王"]) {
  const a = computeDesiredTutorPublicActive({ ...base, name });
  assert.equal(a.suspiciousName, false, `expected eligible: ${name}`);
  assert.equal(a.desiredActive, true, `expected public: ${name}`);
}

// canViewTutorProfilePublicly — public profile route gate
{
  assert.equal(canViewTutorProfilePublicly({ ...base, active: true }), true);
  assert.equal(canViewTutorProfilePublicly({ ...base, active: false }), false);
  assert.equal(
    canViewTutorProfilePublicly({ ...base, active: true, suspended: true }),
    false,
  );
  assert.equal(
    canViewTutorProfilePublicly({ ...base, active: true, emailVerified: null }),
    false,
  );
  assert.equal(
    canViewTutorProfilePublicly({ ...base, active: true, headline: "" }),
    false,
  );
  assert.equal(
    canViewTutorProfilePublicly({ ...base, active: true, forceActive: true, headline: "" }),
    true,
  );
}

// Search/sitemap select parents without subjectProfiles — must not zero out catalogue
{
  const { hasValidTeachingProfile: _tp, hasValidListingRate: _lr, ...withoutTeachingFlags } = base;
  assert.equal(
    canViewTutorProfilePublicly({ ...withoutTeachingFlags, active: true }),
    true,
  );
  assert.equal(
    canViewTutorProfilePublicly({
      ...withoutTeachingFlags,
      active: true,
      hasValidTeachingProfile: false,
      hasValidListingRate: false,
    }),
    false,
  );
}

console.log("tutor-public-eligibility.test.ts: ok");
