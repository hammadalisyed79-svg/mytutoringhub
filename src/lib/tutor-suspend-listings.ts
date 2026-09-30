import { prisma } from "@/lib/prisma";

/**
 * Hide every public listing surface for a suspended tutor account.
 * Teaching Profiles (SubjectProfile) and legacy TutorAd mirrors must both leave ACTIVE.
 */
export async function pauseTutorPublicSurfaces(userId: string) {
  await prisma.$transaction([
    prisma.tutorProfile.updateMany({
      where: { userId },
      data: { active: false, forceActive: false },
    }),
    prisma.subjectProfile.updateMany({
      where: { tutorProfile: { userId }, status: "ACTIVE" },
      data: { status: "PAUSED" },
    }),
    prisma.tutorAd.updateMany({
      where: { tutorProfile: { userId }, status: "ACTIVE" },
      data: { status: "PAUSED" },
    }),
  ]);
}

/** Repair leak: ACTIVE listings still attached to suspended accounts. */
export async function pauseAllSuspendedTutorPublicSurfaces() {
  const suspendedUserIds = (
    await prisma.user.findMany({
      where: { suspended: true },
      select: { id: true },
    })
  ).map((u) => u.id);

  if (suspendedUserIds.length === 0) {
    return { tutors: 0, profilesPaused: 0, adsPaused: 0, parentsCleared: 0 };
  }

  const [parentsCleared, profilesPaused, adsPaused] = await prisma.$transaction([
    prisma.tutorProfile.updateMany({
      where: {
        userId: { in: suspendedUserIds },
        OR: [{ active: true }, { forceActive: true }],
      },
      data: { active: false, forceActive: false },
    }),
    prisma.subjectProfile.updateMany({
      where: {
        status: "ACTIVE",
        tutorProfile: { userId: { in: suspendedUserIds } },
      },
      data: { status: "PAUSED" },
    }),
    prisma.tutorAd.updateMany({
      where: {
        status: "ACTIVE",
        tutorProfile: { userId: { in: suspendedUserIds } },
      },
      data: { status: "PAUSED" },
    }),
  ]);

  return {
    tutors: suspendedUserIds.length,
    parentsCleared: parentsCleared.count,
    profilesPaused: profilesPaused.count,
    adsPaused: adsPaused.count,
  };
}
