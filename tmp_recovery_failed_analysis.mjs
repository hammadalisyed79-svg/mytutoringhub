import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const { prisma } = await import("./src/lib/prisma.ts");
const { selectTutorRecoveryAudience } = await import("./src/lib/tutor-recovery-audience.ts");
const { NURTURE_SEQUENCES } = await import("./src/lib/email-nurture.ts");
const { computeDesiredTutorPublicActive } = await import("./src/lib/tutor-public-eligibility.ts");
const { getTutorProfileCompletion } = await import("./src/lib/tutor-profile-completion.ts");
const { isSuspiciousDisplayName } = await import("./src/lib/display-name.ts");

const aud = await selectTutorRecoveryAudience({ limit: 500 });
const r1 = await prisma.emailSequenceEvent.findMany({
  where: { sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R1 },
  select: { userId: true, sentAt: true },
});
const r1set = new Set(r1.map((x) => x.userId));

// Users who were likely in send batch: all tutors without R1 but incomplete hidden
const tutors = await prisma.user.findMany({
  where: { role: "TUTOR" },
  select: {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    suspended: true,
    tutorProfile: true,
  },
});

const withoutR1 = tutors.filter((u) => !r1set.has(u.id) && u.tutorProfile);
const failedAnalysis = [];
for (const u of withoutR1) {
  const tp = u.tutorProfile;
  if (!tp) continue;
  const completion = getTutorProfileCompletion({ ...tp, name: u.name });
  const assessment = computeDesiredTutorPublicActive({
    forceActive: tp.forceActive,
    emailVerified: u.emailVerified,
    name: u.name,
    photoUrl: tp.photoUrl,
    headline: tp.headline,
    bio: tp.bio,
    country: tp.country,
    location: tp.location,
    subjects: tp.subjects,
    hourlyRate: tp.hourlyRate,
    online: tp.online,
    inPerson: tp.inPerson,
    qualifications: tp.qualifications,
    suspended: u.suspended,
  });
  let bucket = "unknown";
  if (tp.active) bucket = "now_live_skipped";
  else if (completion.complete) bucket = "now_complete_skipped";
  else if (isSuspiciousDisplayName(u.name)) bucket = "suspicious_excluded";
  else if (!u.emailVerified) bucket = "unverified_excluded";
  else if (u.suspended) bucket = "suspended_excluded";
  else if (!aud.rows.some((r) => r.userId === u.id)) bucket = "not_in_current_audience";
  else bucket = "likely_failed_or_ineligible_at_send";

  failedAnalysis.push({
    displayName: u.name,
    bucket,
    completenessPct: Math.round((completion.requiredDone / completion.requiredTotal) * 100),
    emailDomain: u.email?.split("@")[1] || "unknown",
    missing: completion.missingRequired,
  });
}

const adminLogs = await prisma.adminAuditLog.findMany({
  where: { action: { contains: "recovery" } },
  orderBy: { createdAt: "desc" },
  take: 10,
  select: { action: true, createdAt: true, detail: true },
});

console.log(
  JSON.stringify(
    {
      r1Sent: r1.length,
      currentEligible: aud.eligibleCount,
      excluded: aud.excluded,
      withoutR1Analysis: failedAnalysis,
      adminLogs,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
