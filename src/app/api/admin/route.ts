import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { AdminActionError, runAdminAction } from "@/lib/admin-actions";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const [
    users,
    tutors,
    tutorsActive,
    students,
    suspended,
    unverified,
    openReports,
    pendingVerification,
    incompletePayments,
    studentAds,
    tutorAds,
    conversations,
    pastPapers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tutorProfile.count(),
    prisma.tutorProfile.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { suspended: true } }),
    prisma.user.count({ where: { emailVerified: null, role: { not: "ADMIN" } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { status: "INCOMPLETE" } }),
    prisma.studentAd.count(),
    prisma.tutorAd.count(),
    prisma.conversation.count(),
    prisma.pastPaper.count(),
  ]);

  return NextResponse.json({
    generatedAt: now.toISOString(),
    counts: {
      users,
      tutors,
      tutorsActive,
      tutorsInactive: tutors - tutorsActive,
      students,
      suspended,
      unverified,
      openReports,
      pendingVerification,
      incompletePayments,
      ads: studentAds + tutorAds,
      conversations,
      pastPapers,
    },
  });
}

async function mutate(req: Request) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const result = await runAdminAction(session.user.id, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    if (err instanceof AdminActionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Admin mutation failed", err);
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return mutate(req);
}

export async function PATCH(req: Request) {
  return mutate(req);
}
