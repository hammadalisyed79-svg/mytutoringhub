import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPostAd } from "@/lib/subscription";
import type { Role } from "@/lib/types";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(5),
  subject: z.string().min(1),
  level: z.string().min(1),
  board: z.string().max(120).optional().nullable(),
  syllabusCode: z.string().max(40).optional().nullable(),
  location: z.string().min(1),
  description: z.string().min(20),
  budget: z.number().optional().nullable(),
  online: z.boolean(),
  inPerson: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await canPostAd(session.user.id, session.user.role as Role);
  if (!allowed) {
    return NextResponse.json(
      { error: "Verified email and an active Student Pass are required to post a request" },
      { status: 403 },
    );
  }

  const data = schema.parse(await req.json());
  const ad = await prisma.studentAd.create({
    data: {
      userId: session.user.id,
      title: data.title,
      subject: data.subject,
      level: data.level,
      board: data.board?.trim() || null,
      syllabusCode: data.syllabusCode?.trim()?.toUpperCase() || null,
      location: data.location,
      description: data.description,
      budget: data.budget ?? null,
      online: data.online,
      inPerson: data.inPerson,
      status: "OPEN",
    },
  });
  return NextResponse.json(ad);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = z.string().parse(body.id);
  const status = z.enum(["OPEN", "CLOSED", "HIDDEN"]).parse(body.status);
  const ad = await prisma.studentAd.findUnique({ where: { id } });
  if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ad.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const updated = await prisma.studentAd.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}
