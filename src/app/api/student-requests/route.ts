import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEPRECATION =
  "Deprecated. Use GET/POST /api/ads and the /ads board (StudentAd). StudentRequest writes are frozen.";

function deprecationHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  h.set("Deprecation", "true");
  h.set("Sunset", "Sat, 01 Aug 2026 00:00:00 GMT");
  h.set("Link", '</api/ads>; rel="successor-version", </ads>; rel="alternate"');
  h.set("X-Deprecated-Message", DEPRECATION);
  return h;
}

/**
 * Legacy StudentRequest API — frozen write path.
 * GET proxies open StudentAd rows (canonical board). POST returns 410.
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

    const ads = await prisma.studentAd.findMany({
      where: {
        status: "OPEN",
        ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        subject: true,
        level: true,
        location: true,
        description: true,
        createdAt: true,
        userId: true,
        user: { select: { name: true } },
      },
    });

    const uid = session?.user?.id;
    const role = session?.user?.role;
    const isAdmin = role === "ADMIN";

    let scoped = ads;
    if (role === "TUTOR" && tutorSubjects.length > 0 && !subject) {
      const matching = ads.filter((a) =>
        tutorSubjects.some(
          (s) => a.subject.toLowerCase().includes(s) || s.includes(a.subject.toLowerCase()),
        ),
      );
      if (matching.length > 0) scoped = matching;
    }

    const sanitized = scoped.map((a) => {
      const isOwner = Boolean(uid && a.userId === uid);
      const subjectMatch =
        role === "TUTOR" &&
        tutorSubjects.some(
          (s) => a.subject.toLowerCase().includes(s) || s.includes(a.subject.toLowerCase()),
        );
      const canSeeStudentId = isOwner || isAdmin || subjectMatch;
      return {
        id: a.id,
        subject: a.subject,
        level: a.level,
        board: null as string | null,
        description: a.description,
        schedule: a.location,
        title: a.title,
        createdAt: a.createdAt,
        student: a.user,
        ...(canSeeStudentId ? { studentId: a.userId } : {}),
      };
    });

    return NextResponse.json(sanitized, { headers: deprecationHeaders() });
  } catch (e) {
    console.error("student-requests GET (deprecated proxy) failed:", e);
    return NextResponse.json([], { status: 200, headers: deprecationHeaders() });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: DEPRECATION,
      use: { board: "/ads", create: "/ads/new", api: "POST /api/ads" },
    },
    { status: 410, headers: deprecationHeaders() },
  );
}
