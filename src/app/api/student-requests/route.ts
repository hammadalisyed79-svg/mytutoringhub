import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().trim().min(1).max(100),
  level: z.string().trim().min(1).max(80),
  board: z.string().trim().max(80).optional(),
  description: z.string().trim().min(10).max(2000),
  schedule: z.string().trim().max(500).optional(),
  isPublic: z.boolean().optional().default(true),
});

/**
 * Legacy StudentRequest API. Prefer StudentAd via /ads.
 * Returns studentId only to the request owner, admins, or tutors whose
 * subjects match the request (never email/phone).
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject") || undefined;

    let tutorSubjects: string[] = [];
    if (session?.user?.role === "TUTOR") {
      const profile = await prisma.tutorProfile.findUnique({
        where: { userId: session.user.id },
        select: { subjects: true },
      });
      tutorSubjects = (profile?.subjects || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }

    const requests = await prisma.studentRequest.findMany({
      where: {
        isPublic: true,
        ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        subject: true,
        level: true,
        board: true,
        description: true,
        schedule: true,
        createdAt: true,
        studentId: true,
        student: { select: { name: true } },
      },
    });

    const uid = session?.user?.id;
    const role = session?.user?.role;
    const isAdmin = role === "ADMIN";

    let scoped = requests;
    if (role === "TUTOR" && tutorSubjects.length > 0 && !subject) {
      const matching = requests.filter((r) =>
        tutorSubjects.some((s) => r.subject.toLowerCase().includes(s) || s.includes(r.subject.toLowerCase())),
      );
      if (matching.length > 0) scoped = matching;
    }

    const sanitized = scoped.map((r) => {
      const isOwner = Boolean(uid && r.studentId === uid);
      const subjectMatch =
        role === "TUTOR" &&
        tutorSubjects.some(
          (s) => r.subject.toLowerCase().includes(s) || s.includes(r.subject.toLowerCase()),
        );
      const canSeeStudentId = isOwner || isAdmin || subjectMatch;
      return {
        id: r.id,
        subject: r.subject,
        level: r.level,
        board: r.board,
        description: r.description,
        schedule: r.schedule,
        createdAt: r.createdAt,
        student: r.student,
        ...(canSeeStudentId ? { studentId: r.studentId } : {}),
      };
    });

    return NextResponse.json(sanitized);
  } catch (e) {
    console.error("student-requests GET failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Sign in to post a request" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can post requests" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const request = await prisma.studentRequest.create({
      data: {
        studentId: session.user.id,
        subject: data.subject,
        level: data.level,
        board: data.board || null,
        description: data.description,
        schedule: data.schedule || null,
        isPublic: data.isPublic ?? true,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid request" }, { status: 400 });
    }
    console.error("student-requests POST failed:", e);
    return NextResponse.json({ error: "Could not create request" }, { status: 500 });
  }
}
