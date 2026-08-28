import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateTutorAd } from "@/lib/subscription";
import {
  defaultSubjectProfileTitle,
  normalizeSubjectLabel,
} from "@/lib/subject-profile";
import {
  canCreateSubjectProfile,
  getSubjectProfileActiveCap,
  isSubjectProfilePromoActive,
  subjectProfilePromoLabel,
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
  PAID_SUBJECT_PROFILE_CAP,
} from "@/lib/subject-profile-entitlements";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(1),
  title: z.string().min(5).max(120),
  level: z.string().min(1),
  board: z.string().max(120).optional(),
  qualification: z.string().max(120).optional(),
  syllabusCode: z.string().max(40).optional(),
  location: z.string().min(1),
  online: z.boolean(),
  inPerson: z.boolean(),
  rate: z.number().min(500).max(50000),
  description: z.string().max(4000).optional(),
  headline: z.string().max(200).optional(),
});

function normalizeOptional(value: string | undefined | null) {
  const trimmed = (value || "").trim();
  return trimmed || null;
}

function serializeListing(row: {
  id: string;
  subject: string;
  title: string;
  headline: string | null;
  level: string;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
  location: string;
  country: string | null;
  rate: number;
  status: string;
  online: boolean;
  inPerson: boolean;
  description: string | null;
  boostUntil: Date | null;
  highlightedUntil: Date | null;
}) {
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    headline: row.headline,
    level: row.level,
    board: row.board,
    qualification: row.qualification,
    syllabusCode: row.syllabusCode,
    location: row.location,
    country: row.country,
    rate: row.rate,
    status: row.status,
    online: row.online,
    inPerson: row.inPerson,
    description: row.description,
    boostUntil: row.boostUntil,
    highlightedUntil: row.highlightedUntil,
  };
}

async function findDuplicateListing(opts: {
  tutorProfileId: string;
  subject: string;
  level: string;
  board: string | null;
  excludeId?: string;
}) {
  const board = opts.board;
  return prisma.subjectProfile.findFirst({
    where: {
      tutorProfileId: opts.tutorProfileId,
      subject: { equals: opts.subject, mode: "insensitive" },
      level: { equals: opts.level, mode: "insensitive" },
      ...(board
        ? { board: { equals: board, mode: "insensitive" } }
        : { OR: [{ board: null }, { board: "" }] }),
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
  });
}

/** Teaching Listings API (Marketplace V2). Route kept as /api/tutor-ads for existing clients. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return NextResponse.json({
      listings: [],
      entitlement: {
        activeCount: 0,
        cap: null as number | null,
        unlimited: true,
        promoActive: isSubjectProfilePromoActive(),
        promoLabel: subjectProfilePromoLabel(),
        freeCapAfterPromo: FREE_SUBJECT_PROFILES_AFTER_PROMO,
        paidCap: PAID_SUBJECT_PROFILE_CAP,
        canCreate: false,
        createReason: "Create your tutor profile first",
      },
    });
  }

  const [rows, cap, gate] = await Promise.all([
    prisma.subjectProfile.findMany({
      where: { tutorProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    }),
    getSubjectProfileActiveCap(session.user.id),
    canCreateSubjectProfile(session.user.id),
  ]);

  const activeCount = rows.filter((r) => r.status === "ACTIVE").length;
  const unlimited = !Number.isFinite(cap);

  return NextResponse.json({
    listings: rows.map(serializeListing),
    entitlement: {
      activeCount,
      cap: unlimited ? null : cap,
      unlimited,
      promoActive: isSubjectProfilePromoActive(),
      promoLabel: subjectProfilePromoLabel(),
      freeCapAfterPromo: FREE_SUBJECT_PROFILES_AFTER_PROMO,
      paidCap: PAID_SUBJECT_PROFILE_CAP,
      canCreate: gate.ok,
      createReason: gate.ok ? null : gate.reason,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await canCreateTutorAd(session.user.id);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
  const data = createSchema.parse(await req.json());
  const subject = normalizeSubjectLabel(data.subject);
  if (!subject) {
    return NextResponse.json({ error: "Enter a subject" }, { status: 400 });
  }

  const board = normalizeOptional(data.board);
  const qualification = normalizeOptional(data.qualification);
  const syllabusCode = normalizeOptional(data.syllabusCode)?.toUpperCase() || null;

  const duplicate = await findDuplicateListing({
    tutorProfileId: gate.profile.id,
    subject,
    level: data.level,
    board,
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: `You already have a teaching listing for ${subject} (${data.level}${board ? ` · ${board}` : ""}). Edit or reactivate it instead.`,
      },
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
      board,
      qualification,
      syllabusCode,
      location: data.location,
      country: tutor?.country || null,
      online: data.online,
      inPerson: data.inPerson,
      rate: data.rate,
      status: "ACTIVE",
      headline: data.headline?.trim() || tutor?.headline || null,
    },
  });

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
      },
    })
    .catch(() => undefined);

  return NextResponse.json(serializeListing(row));
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
  const nextLevel = body.level != null ? String(body.level).slice(0, 80) : row.level;
  const nextBoard =
    body.board !== undefined ? normalizeOptional(String(body.board || "")) : row.board;

  if (nextSubject || body.level != null || body.board !== undefined) {
    const clash = await findDuplicateListing({
      tutorProfileId: profile.id,
      subject: nextSubject || row.subject,
      level: nextLevel,
      board: nextBoard,
      excludeId: id,
    });
    if (clash) {
      return NextResponse.json(
        { error: `You already have a teaching listing for that subject, level, and board.` },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.subjectProfile.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(body.title != null ? { title: String(body.title).slice(0, 120) } : {}),
      ...(body.headline !== undefined
        ? { headline: body.headline ? String(body.headline).slice(0, 200) : null }
        : {}),
      ...(nextSubject ? { subject: nextSubject } : {}),
      ...(body.rate != null ? { rate: Number(body.rate) } : {}),
      ...(body.level != null ? { level: nextLevel } : {}),
      ...(body.board !== undefined ? { board: nextBoard } : {}),
      ...(body.qualification !== undefined
        ? { qualification: normalizeOptional(String(body.qualification || "")) }
        : {}),
      ...(body.syllabusCode !== undefined
        ? {
            syllabusCode: normalizeOptional(String(body.syllabusCode || ""))?.toUpperCase() || null,
          }
        : {}),
      ...(body.location != null ? { location: String(body.location).slice(0, 120) } : {}),
      ...(body.description !== undefined
        ? { description: body.description ? String(body.description).slice(0, 4000) : null }
        : {}),
      ...(typeof body.online === "boolean" ? { online: body.online } : {}),
      ...(typeof body.inPerson === "boolean" ? { inPerson: body.inPerson } : {}),
    },
  });

  await prisma.tutorAd
    .updateMany({
      where: { tutorProfileId: profile.id, subject: row.subject },
      data: {
        ...(status ? { status } : {}),
        ...(body.title != null ? { title: String(body.title).slice(0, 120) } : {}),
        ...(nextSubject ? { subject: nextSubject } : {}),
        ...(body.rate != null ? { rate: Number(body.rate) } : {}),
        ...(body.level != null ? { level: nextLevel } : {}),
        ...(body.location != null ? { location: String(body.location).slice(0, 120) } : {}),
        ...(body.description !== undefined
          ? { description: body.description ? String(body.description).slice(0, 4000) : null }
          : {}),
        ...(typeof body.online === "boolean" ? { online: body.online } : {}),
        ...(typeof body.inPerson === "boolean" ? { inPerson: body.inPerson } : {}),
      },
    })
    .catch(() => undefined);

  return NextResponse.json(serializeListing(updated));
}
