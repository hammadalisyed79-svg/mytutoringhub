import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [users, ads, tutors, subscriptions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { subscriptions: true, studentAds: true } },
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
  ]);
  return NextResponse.json({ users, ads, tutors, subscriptions });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = z.enum(["hide_ad", "open_ad", "deactivate_tutor", "activate_tutor"]).parse(body.action);
  const id = z.string().parse(body.id);

  if (action === "hide_ad" || action === "open_ad") {
    const status = action === "hide_ad" ? "HIDDEN" : "OPEN";
    await prisma.studentAd.update({ where: { id }, data: { status } });
  }
  if (action === "deactivate_tutor" || action === "activate_tutor") {
    await prisma.tutorProfile.update({
      where: { id },
      data: { active: action === "activate_tutor" },
    });
  }
  return NextResponse.json({ ok: true });
}
