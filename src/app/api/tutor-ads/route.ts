import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateTutorAd } from "@/lib/subscription";
import {
  defaultSubjectProfileTitle,
  normalizeSubjectLabel,
} from "@/lib/subject-profile";
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

/** Subject profiles API (Phase B). Route kept as /api/tutor-ads for existing UI. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json([]);
  const rows = await prisma.subjectProfile.findMany({
    where: { tutorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      title: row.title,
      level: row.level,
      location: row.location,
      rate: row.rate,
      status: row.status,
      online: row.online,
      inPerson: row.inPerson,
      description: row.description,
      boostUntil: row.boostUntil,
      highlightedUntil: row.highlightedUntil,
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await canCreateTutorAd(session.user.id);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
  const data = schema.parse(await req.json());
  const subject = normalizeSubjectLabel(data.subject);
  if (!subject) {
    return NextResponse.json({ error: "Enter a subject" }, { status: 400 });
  }

  const existing = await prisma.subjectProfile.findUnique({
    where: {
      tutorProfileId_subject: {
        tutorProfileId: gate.profile.id,
        subject,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: `You already have a subject profile for ${subject}. Edit or reactivate it instead.` },
      { status: 409 },
    );
  }

  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: gate.profile.id },
    include: { user: { select: { name: true } } },
  });

  const row = await prisma.subjectProfile.create({
    data: {
      tutorProfileId: gate.profile.id,
      subject,
      title: data.title.trim() || defaultSubjectProfileTitle(subject, tutor?.user.name),
      description: data.description || null,
      level: data.level,
      location: data.location,
      country: tutor?.country || null,
      online: data.online,
      inPerson: data.inPerson,
      rate: data.rate,
      status: "ACTIVE",
      highlightedUntil: tutor?.highlightedUntil || null,
      boostUntil: tutor?.boostUntil || null,
      headline: tutor?.headline || null,
    },
  });

  // Dual-write legacy TutorAd for admin tools during transition.
  await prisma.tutorAd
    .create({
      data: {
        tutorProfileId: gate.profile.id,
        subject: row.subject,
        title: row.title,
        level: row.level,
        location: row.location,
        online: row.online,
        inPerson: row.inPerson,
        rate: row.rate,
        description: row.description,
        status: row.status,
        highlightedUntil: row.highlightedUntil,
        boostUntil: row.boostUntil,
      },
    })
    .catch(() => undefined);

  return NextResponse.json({
    id: row.id,
    subject: row.subject,
    title: row.title,
    level: row.level,
    location: row.location,
    rate: row.rate,
    status: row.status,
    online: row.online,
    inPerson: row.inPerson,
  });
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
  const row = await prisma.subjectProfile.findFirst({ where: { id, tutorProfileId: profile.id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "ACTIVE" && row.status !== "ACTIVE") {
    const gate = await canCreateTutorAd(session.user.id);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  const nextSubject = body.subject ? normalizeSubjectLabel(String(body.subject)) : undefined;
  if (nextSubject && nextSubject.toLowerCase() !== row.subject.toLowerCase()) {
    const clash = await prisma.subjectProfile.findUnique({
      where: {
        tutorProfileId_subject: {
          tutorProfileId: profile.id,
          subject: nextSubject,
        },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: `You already have a subject profile for ${nextSubject}.` },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.subjectProfile.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(body.title ? { title: String(body.title).slice(0, 120) } : {}),
      ...(nextSubject ? { subject: nextSubject } : {}),
      ...(body.rate != null ? { rate: Number(body.rate) } : {}),
    },
  });

  await prisma.tutorAd
    .updateMany({
      where: { tutorProfileId: profile.id, subject: row.subject },
      data: {
        ...(status ? { status } : {}),
        ...(body.title ? { title: String(body.title).slice(0, 120) } : {}),
        ...(nextSubject ? { subject: nextSubject } : {}),
        ...(body.rate != null ? { rate: Number(body.rate) } : {}),
      },
    })
    .catch(() => undefined);

  return NextResponse.json({
    id: updated.id,
    subject: updated.subject,
    title: updated.title,
    level: updated.level,
    location: updated.location,
    rate: updated.rate,
    status: updated.status,
    online: updated.online,
    inPerson: updated.inPerson,
  });
}
