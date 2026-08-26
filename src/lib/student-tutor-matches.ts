import { prisma } from "@/lib/prisma";
import {
  filterCanonicallyPublicTutors,
  publicListedTutorWhere,
} from "@/lib/tutor-public-eligibility";

async function countCanonicalPublicTutors(
  where: NonNullable<Parameters<typeof prisma.tutorProfile.findMany>[0]>["where"],
) {
  const rows = await prisma.tutorProfile.findMany({
    where,
    select: {
      active: true,
      forceActive: true,
      photoUrl: true,
      headline: true,
      bio: true,
      country: true,
      location: true,
      subjects: true,
      hourlyRate: true,
      online: true,
      inPerson: true,
      qualifications: true,
      user: { select: { name: true, emailVerified: true, suspended: true } },
    },
  });
  return filterCanonicallyPublicTutors(rows).length;
}

export type StudentWelcomeMatch =
  | { kind: "subjects"; count: number; subjects: string[] }
  | { kind: "browse"; count: number };

/** Infer student interests from ads, requests, and past tutor chats; count matching listings. */
export async function getStudentWelcomeMatch(userId: string): Promise<StudentWelcomeMatch> {
  const [ads, requests, conversations] = await Promise.all([
    prisma.studentAd.findMany({
      where: { userId },
      select: { subject: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.studentRequest.findMany({
      where: { studentId: userId },
      select: { subject: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      take: 6,
      orderBy: { lastMessageAt: "desc" },
      select: {
        userAId: true,
        userBId: true,
        userA: { select: { tutorProfile: { select: { subjects: true } } } },
        userB: { select: { tutorProfile: { select: { subjects: true } } } },
      },
    }),
  ]);

  const subjectSet = new Set<string>();
  for (const row of ads) {
    const s = row.subject?.trim();
    if (s) subjectSet.add(s);
  }
  for (const row of requests) {
    const s = row.subject?.trim();
    if (s) subjectSet.add(s);
  }
  for (const row of conversations) {
    const profile =
      row.userAId === userId ? row.userB.tutorProfile : row.userA.tutorProfile;
    if (!profile?.subjects) continue;
    for (const part of profile.subjects.split(/[,;/|]/)) {
      const s = part.trim();
      if (s) subjectSet.add(s);
    }
  }

  const subjects = [...subjectSet].slice(0, 5);

  if (subjects.length === 0) {
    const count = await countCanonicalPublicTutors(publicListedTutorWhere());
    return { kind: "browse", count };
  }

  const count = await countCanonicalPublicTutors({
    ...publicListedTutorWhere(),
    OR: subjects.map((subject) => ({
      subjects: { contains: subject, mode: "insensitive" as const },
    })),
  });

  return { kind: "subjects", count, subjects };
}
