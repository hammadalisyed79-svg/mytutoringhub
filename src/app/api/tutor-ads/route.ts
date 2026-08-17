import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateTutorAd } from "@/lib/subscription";
import { z } from "zod";

const schema = z.object({
  subject: z.string().min(1),
  title: z.string().min(5).max(120),
  level: z.string().min(1),
  location: z.string().min(1),
  online: z.boolean(),
  inPerson: z.boolean(),
  rate: z.number().min(500).max(50000),
  description: z.string().max(4000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json([]);
  const ads = await prisma.tutorAd.findMany({
    where: { tutorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(ads);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await canCreateTutorAd(session.user.id);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
  const data = schema.parse(await req.json());
  const ad = await prisma.tutorAd.create({
    data: {
      tutorProfileId: gate.profile.id,
      subject: data.subject,
      title: data.title,
      level: data.level,
      location: data.location,
      online: data.online,
      inPerson: data.inPerson,
      rate: data.rate,
      description: data.description || null,
      status: "ACTIVE",
      highlightedUntil: gate.profile.highlightedUntil,
      boostUntil: gate.profile.boostUntil,
    },
  });
  return NextResponse.json(ad);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = z.string().parse(body.id);
  const status = z.enum(["ACTIVE", "PAUSED", "HIDDEN"]).optional().parse(body.status);
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });
  const ad = await prisma.tutorAd.findFirst({ where: { id, tutorProfileId: profile.id } });
  if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "ACTIVE" && ad.status !== "ACTIVE") {
    const gate = await canCreateTutorAd(session.user.id);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  const updated = await prisma.tutorAd.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(body.title ? { title: String(body.title) } : {}),
      ...(body.subject ? { subject: String(body.subject) } : {}),
      ...(body.rate != null ? { rate: Number(body.rate) } : {}),
    },
  });
  return NextResponse.json(updated);
}
