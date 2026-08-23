/**
 * Admin supply overview + subject gap signals from real DB data.
 */
import { prisma } from "@/lib/prisma";
import { isSuspiciousDisplayName } from "@/lib/display-name";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";
import { publicListedTutorWhere } from "@/lib/tutor-public-eligibility";
import { isTutorProfileStarted } from "@/lib/tutor-profile-completion";

export type TutorSupplyOverview = {
  totalTutorAccounts: number;
  live: number;
  incomplete: number;
  suspended: number;
  suspiciousHidden: number;
  unverifiedEmail: number;
  neverStarted: number;
  newlyLiveThisWeek: number;
};

export type SupplyGapRow = {
  subject: string;
  liveTutors: number;
  incompleteTutors: number;
  openStudentRequests: number;
};

function splitSubjects(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getTutorSupplyOverview(): Promise<TutorSupplyOverview> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalTutorAccounts, live, suspendedUsers, profiles] = await Promise.all([
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.tutorProfile.count({ where: publicListedTutorWhere() }),
    prisma.user.count({ where: { role: "TUTOR", suspended: true } }),
    prisma.tutorProfile.findMany({
      include: {
        user: {
          select: { name: true, suspended: true, emailVerified: true, role: true },
        },
      },
    }),
  ]);

  let incomplete = 0;
  let suspiciousHidden = 0;
  let unverifiedEmail = 0;
  let neverStarted = 0;
  let newlyLiveThisWeek = 0;

  for (const profile of profiles) {
    if (profile.user.role !== "TUTOR") continue;
    if (profile.active && profile.updatedAt >= weekAgo) {
      newlyLiveThisWeek += 1;
    }
    if (profile.user.suspended) continue;
    if (profile.active) continue;

    if (isSuspiciousDisplayName(profile.user.name)) {
      suspiciousHidden += 1;
      continue;
    }
    if (!profile.user.emailVerified) {
      unverifiedEmail += 1;
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
    if (!completion.complete) {
      incomplete += 1;
      if (!isTutorProfileStarted(profile)) neverStarted += 1;
    }
  }

  return {
    totalTutorAccounts,
    live,
    incomplete,
    suspended: suspendedUsers,
    suspiciousHidden,
    unverifiedEmail,
    neverStarted,
    newlyLiveThisWeek,
  };
}

/** Top subjects by open student demand vs live supply (real data only). */
export async function getTutorSupplyGapReport(limit = 15): Promise<SupplyGapRow[]> {
  const [liveProfiles, incompleteProfiles, openAds] = await Promise.all([
    prisma.tutorProfile.findMany({
      where: publicListedTutorWhere(),
      select: { subjects: true },
    }),
    prisma.tutorProfile.findMany({
      where: {
        active: false,
        user: { role: "TUTOR", suspended: false },
      },
      include: { user: { select: { name: true } } },
    }),
    prisma.studentAd.findMany({
      where: { status: "OPEN" },
      select: { subject: true },
    }),
  ]);

  const liveBy = new Map<string, number>();
  for (const p of liveProfiles) {
    for (const s of splitSubjects(p.subjects)) {
      liveBy.set(s, (liveBy.get(s) || 0) + 1);
    }
  }

  const incompleteBy = new Map<string, number>();
  for (const p of incompleteProfiles) {
    if (isSuspiciousDisplayName(p.user.name)) continue;
    const completion = getTutorProfileCompletion({
      name: p.user.name,
      photoUrl: p.photoUrl,
      headline: p.headline,
      bio: p.bio,
      country: p.country,
      location: p.location,
      subjects: p.subjects,
      hourlyRate: p.hourlyRate,
      online: p.online,
      inPerson: p.inPerson,
      qualifications: p.qualifications,
    });
    if (completion.complete) continue;
    for (const s of splitSubjects(p.subjects)) {
      incompleteBy.set(s, (incompleteBy.get(s) || 0) + 1);
    }
    if (!p.subjects?.trim()) {
      incompleteBy.set("(no subjects yet)", (incompleteBy.get("(no subjects yet)") || 0) + 1);
    }
  }

  const demandBy = new Map<string, number>();
  for (const ad of openAds) {
    const s = ad.subject?.trim() || "(unspecified)";
    demandBy.set(s, (demandBy.get(s) || 0) + 1);
  }

  const subjects = new Set([...liveBy.keys(), ...incompleteBy.keys(), ...demandBy.keys()]);
  const rows: SupplyGapRow[] = [];
  for (const subject of subjects) {
    rows.push({
      subject,
      liveTutors: liveBy.get(subject) || 0,
      incompleteTutors: incompleteBy.get(subject) || 0,
      openStudentRequests: demandBy.get(subject) || 0,
    });
  }

  rows.sort((a, b) => {
    const gapA = a.openStudentRequests - a.liveTutors;
    const gapB = b.openStudentRequests - b.liveTutors;
    if (gapB !== gapA) return gapB - gapA;
    if (b.openStudentRequests !== a.openStudentRequests) {
      return b.openStudentRequests - a.openStudentRequests;
    }
    return a.liveTutors - b.liveTutors;
  });

  return rows.slice(0, limit);
}
