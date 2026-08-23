import assert from "node:assert/strict";
import { isSuspiciousDisplayName } from "@/lib/display-name";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";

/**
 * Mirrors selectTutorRecoveryAudience exclusion rules without DB —
 * ensures inappropriate accounts are not treated as outreach-ready.
 */
function wouldIncludeInRecovery(input: {
  suspended: boolean;
  active: boolean;
  name: string;
  emailVerified: boolean;
  profile: Parameters<typeof getTutorProfileCompletion>[0];
}) {
  if (input.suspended) return { ok: false as const, reason: "suspended" };
  if (input.active) return { ok: false as const, reason: "already_live" };
  if (isSuspiciousDisplayName(input.name)) return { ok: false as const, reason: "suspicious" };
  if (!input.emailVerified) return { ok: false as const, reason: "unverified" };
  const completion = getTutorProfileCompletion({ ...input.profile, name: input.name });
  if (completion.complete) return { ok: false as const, reason: "complete_but_hidden" };
  return { ok: true as const };
}

const profile = {
  photoUrl: "https://example.com/p.jpg",
  headline: "IGCSE Maths tutor",
  bio: "I teach Cambridge IGCSE Mathematics with weekly practice papers and clear feedback.",
  country: "Pakistan",
  location: "Karachi",
  subjects: "Mathematics",
  hourlyRate: 1500,
  online: true,
  inPerson: false,
  qualifications: "",
};

assert.equal(
  wouldIncludeInRecovery({
    suspended: false,
    active: false,
    name: "Ali Raza",
    emailVerified: true,
    profile,
  }).ok,
  true,
);

assert.equal(
  wouldIncludeInRecovery({
    suspended: true,
    active: false,
    name: "Ali Raza",
    emailVerified: true,
    profile,
  }).reason,
  "suspended",
);

assert.equal(
  wouldIncludeInRecovery({
    suspended: false,
    active: false,
    name: "★★ spam.com",
    emailVerified: true,
    profile,
  }).reason,
  "suspicious",
);

assert.equal(
  wouldIncludeInRecovery({
    suspended: false,
    active: false,
    name: "Ali Raza",
    emailVerified: false,
    profile,
  }).reason,
  "unverified",
);

assert.equal(
  wouldIncludeInRecovery({
    suspended: false,
    active: true,
    name: "Ali Raza",
    emailVerified: true,
    profile,
  }).reason,
  "already_live",
);

console.log("tutor-recovery-audience.test.ts: ok");
