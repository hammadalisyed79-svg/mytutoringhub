import { prisma } from "@/lib/prisma";
import { publicListedTutorWhere } from "@/lib/tutor-public-eligibility";

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
    const count = await prisma.tutorProfile.count({
      where: publicListedTutorWhere(),
    });
    return { kind: "browse", count };
  }

  const count = await prisma.tutorProfile.count({
    where: {
      ...publicListedTutorWhere(),
      OR: subjects.map((subject) => ({
        subjects: { contains: subject, mode: "insensitive" as const },
      })),
    },
  });

  return { kind: "subjects", count, subjects };
}
