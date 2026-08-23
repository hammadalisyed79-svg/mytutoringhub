/**
 * Safe selection of legitimate incomplete tutors for profile-completion outreach.
 * Never includes suspended or suspicious-name accounts. Does not send email.
 */
import { prisma } from "@/lib/prisma";
import { isSuspiciousDisplayName } from "@/lib/display-name";
import { getTutorProfileCompletion, isTutorProfileStarted } from "@/lib/tutor-profile-completion";
import { isEmailVerifiedFlag } from "@/lib/tutor-public-eligibility";

export type RecoveryAudienceRow = {
  userId: string;
  profileId: string;
  /** Redacted for logs — never print full email in reports. */
  emailDomain: string;
  name: string;
  requiredDone: number;
  requiredTotal: number;
  missingRequired: string[];
  profileStarted: boolean;
  emailVerified: boolean;
  createdAt: Date;
};

export type RecoveryAudienceResult = {
  totalScanned: number;
  eligibleCount: number;
  excluded: {
    suspended: number;
    suspiciousName: number;
    alreadyLive: number;
    completeButHidden: number;
    unverifiedEmail: number;
  };
  rows: RecoveryAudienceRow[];
};

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "(unknown)";
}

/**
 * Candidates: tutor role, not suspended, not live, email verified,
 * incomplete profile, not suspicious display name.
 */
export async function selectTutorRecoveryAudience(opts?: {
  limit?: number;
  requireEmailVerified?: boolean;
}): Promise<RecoveryAudienceResult> {
  const limit = opts?.limit ?? 500;
  const requireEmailVerified = opts?.requireEmailVerified !== false;

  const profiles = await prisma.tutorProfile.findMany({
    where: {
      active: false,
      user: {
        role: "TUTOR",
        suspended: false,
      },
    },
    take: Math.min(limit * 3, 2000),
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          suspended: true,
          emailVerified: true,
          createdAt: true,
        },
      },
    },
  });

  const excluded = {
    suspended: 0,
    suspiciousName: 0,
    alreadyLive: 0,
    completeButHidden: 0,
    unverifiedEmail: 0,
  };

  const rows: RecoveryAudienceRow[] = [];

  for (const profile of profiles) {
    if (profile.user.suspended) {
      excluded.suspended += 1;
      continue;
    }
    if (profile.active) {
      excluded.alreadyLive += 1;
      continue;
    }
    if (isSuspiciousDisplayName(profile.user.name)) {
      excluded.suspiciousName += 1;
      continue;
    }
    const emailVerified = isEmailVerifiedFlag(profile.user.emailVerified);
    if (requireEmailVerified && !emailVerified) {
      excluded.unverifiedEmail += 1;
      continue;
    }

    const completion = getTutorProfileCompletion({
      name: profile.user.name,
      photoUrl: profile.photoUrl,
      headline: profile.headline,
      bio: profile.bio,
      country: profile.country,
      location: profile.location,
      subjects: profile.subjects,
      hourlyRate: profile.hourlyRate,
      online: profile.online,
      inPerson: profile.inPerson,
      qualifications: profile.qualifications,
    });

    if (completion.complete) {
      excluded.completeButHidden += 1;
      continue;
    }

    if (!profile.user.email) continue;

    rows.push({
      userId: profile.user.id,
      profileId: profile.id,
      emailDomain: emailDomain(profile.user.email),
      name: profile.user.name,
      requiredDone: completion.requiredDone,
      requiredTotal: completion.requiredTotal,
      missingRequired: completion.missingRequired,
      profileStarted: isTutorProfileStarted(profile),
      emailVerified,
      createdAt: profile.user.createdAt,
    });

    if (rows.length >= limit) break;
  }

  return {
    totalScanned: profiles.length,
    eligibleCount: rows.length,
    excluded,
    rows,
  };
}
