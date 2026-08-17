import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [users, ads, tutors, subscriptions, verifications, reports, reviews] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        suspended: true,
        createdAt: true,
      },
    }),
    prisma.studentAd.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.tutorProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.verificationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reporter: { select: { name: true, email: true } } },
    }),
    prisma.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        student: { select: { name: true } },
        tutorProfile: { include: { user: { select: { name: true } } } },
      },
    }),
  ]);
  return NextResponse.json({
    users,
    ads,
    tutors,
    subscriptions,
    verifications,
    reports,
    reviews,
  });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = z
    .enum([
      "hide_ad",
      "open_ad",
      "deactivate_tutor",
      "activate_tutor",
      "verify_approve",
      "verify_reject",
      "review_publish",
      "review_hide",
      "report_resolve",
      "report_dismiss",
      "suspend_user",
      "unsuspend_user",
      "set_verified",
      "hide_tutor_ad",
    ])
    .parse(body.action);
  const id = z.string().parse(body.id);

  if (action === "hide_ad" || action === "open_ad") {
    await prisma.studentAd.update({
      where: { id },
      data: { status: action === "hide_ad" ? "HIDDEN" : "OPEN" },
    });
  }
  if (action === "deactivate_tutor" || action === "activate_tutor") {
    await prisma.tutorProfile.update({
      where: { id },
      data: { active: action === "activate_tutor" },
    });
  }
  if (action === "verify_approve" || action === "verify_reject") {
    const reqItem = await prisma.verificationRequest.update({
      where: { id },
      data: {
        status: action === "verify_approve" ? "APPROVED" : "REJECTED",
        adminNote: body.adminNote ? String(body.adminNote) : null,
      },
    });
    if (action === "verify_approve") {
      await prisma.tutorProfile.updateMany({
        where: { userId: reqItem.userId },
        data: { verified: true },
      });
    }
  }
  if (action === "review_publish" || action === "review_hide") {
    await prisma.review.update({
      where: { id },
      data: { status: action === "review_publish" ? "PUBLISHED" : "HIDDEN" },
    });
  }
  if (action === "report_resolve" || action === "report_dismiss") {
    await prisma.report.update({
      where: { id },
      data: { status: action === "report_resolve" ? "RESOLVED" : "DISMISSED" },
    });
  }
  if (action === "suspend_user" || action === "unsuspend_user") {
    await prisma.user.update({
      where: { id },
      data: { suspended: action === "suspend_user" },
    });
    if (action === "suspend_user") {
      await prisma.tutorProfile.updateMany({ where: { userId: id }, data: { active: false } });
    }
  }
  if (action === "set_verified") {
    await prisma.tutorProfile.update({
      where: { id },
      data: { verified: Boolean(body.verified) },
    });
  }
  if (action === "hide_tutor_ad") {
    await prisma.tutorAd.update({ where: { id }, data: { status: "HIDDEN" } });
  }

  return NextResponse.json({ ok: true });
}
