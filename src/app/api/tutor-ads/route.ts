import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateTutorAd, syncTutorBadges } from "@/lib/subscription";
import { normalizeSubjectLabel } from "@/lib/subject-profile";
import {
  canCreateSubjectProfile,
  getSubjectProfileActiveCap,
  isSubjectProfilePromoActive,
  subjectProfilePromoLabel,
  FREE_SUBJECT_PROFILES_AFTER_PROMO,
  PAID_SUBJECT_PROFILE_CAP,
} from "@/lib/subject-profile-entitlements";
import {
  capabilitiesFromListingInput,
  displayScalarsFromCapabilities,
} from "@/lib/teaching-profile-capabilities";
import { canonicalTeachingSubject } from "@/lib/teaching-profile-subject";
import {
  ActiveCanonicalSubjectConflictError,
  activeCanonicalConflictPayload,
  shouldRejectActiveCanonicalWrite,
  tutorCanonicalDuplicateNotice,
} from "@/lib/teaching-profile-duplicates";
import {
  insertTeachingProfile,
  listTeachingProfilesForUniqueness,
  replaceSubjectProfileCapabilities,
  syncDerivedMasterSubjects,
  teachingProfilePersistFields,
} from "@/lib/teaching-profile-write";
import { leftoverCsvTagsNotExploded } from "@/lib/teaching-profile-consolidation";
import { teachingProfileEditorValues } from "@/lib/teaching-profile-dashboard";
import { isMissingCapabilitySchemaError } from "@/lib/search-capabilities";
import { z } from "zod";

const stringList = z.array(z.string()).optional();

const createSchema = z.object({
  subject: z.string().min(1),
  title: z.string().min(5).max(120),
  level: z.string().min(1).optional(),
  board: z.string().max(120).optional(),
  qualification: z.string().max(120).optional(),
  syllabusCode: z.string().max(40).optional(),
  levels: stringList,
  boards: stringList,
  qualifications: stringList,
  syllabusCodes: stringList,
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
  capabilities?: { kind: string; value: string }[] | null;
}) {
  const editor = teachingProfileEditorValues(row);
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    headline: row.headline,
    level: row.level,
    board: row.board,
    qualification: row.qualification,
    syllabusCode: row.syllabusCode,
    levels: editor.levels,
    boards: editor.boards,
    qualifications: editor.qualifications,
    syllabusCodes: editor.syllabusCodes,
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

function uniquenessRows(
  rows: { id: string; status: string; subject: string; canonicalSubject?: string | null }[],
) {
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    subject: row.subject,
    canonicalSubject: row.canonicalSubject,
  }));
}

const listingSelect = {
  id: true,
  subject: true,
  title: true,
  headline: true,
  level: true,
  board: true,
  qualification: true,
  syllabusCode: true,
  location: true,
  country: true,
  rate: true,
  status: true,
  online: true,
  inPerson: true,
  description: true,
  boostUntil: true,
  highlightedUntil: true,
} as const;

const listingSelectWithCapabilities = {
  ...listingSelect,
  capabilities: { select: { kind: true, value: true } },
} as const;

async function loadTutorListings(tutorProfileId: string) {
  try {
    return await prisma.subjectProfile.findMany({
      where: { tutorProfileId },
      orderBy: { createdAt: "desc" },
      select: listingSelectWithCapabilities,
    });
  } catch (err) {
    if (!isMissingCapabilitySchemaError(err)) throw err;
    return prisma.subjectProfile.findMany({
      where: { tutorProfileId },
      orderBy: { createdAt: "desc" },
      select: listingSelect,
    });
  }
}

/** Teaching Listings API (Marketplace V2). Route kept as /api/tutor-ads for existing clients. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return NextResponse.json({
      listings: [],
      duplicateNotice: null,
      canonicalDuplicates: [],
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
    loadTutorListings(profile.id),
    getSubjectProfileActiveCap(session.user.id),
    canCreateSubjectProfile(session.user.id),
  ]);

  const activeCount = rows.filter((r) => r.status === "ACTIVE").length;
  const unlimited = !Number.isFinite(cap);
  const duplicateNotice = tutorCanonicalDuplicateNotice(uniquenessRows(rows));


  const leftoverTags = leftoverCsvTagsNotExploded(profile.subjects, rows).map((row) => row.tag);

  return NextResponse.json({
    listings: rows.map(serializeListing),
    duplicateNotice: duplicateNotice?.message ?? null,
    canonicalDuplicates: duplicateNotice?.groups ?? [],
    leftoverTags,
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
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: gate.profile.id },
    include: { user: { select: { name: true } } },
  });

  let persist;
  try {
    persist = teachingProfilePersistFields(
      {
        subject: data.subject,
        title: data.title,
        headline: data.headline?.trim() || tutor?.headline,
        description: data.description,
        rate: data.rate,
        online: data.online,
        inPerson: data.inPerson,
        location: data.location,
        country: tutor?.country,
        levels: data.levels,
        boards: data.boards,
        qualifications: data.qualifications,
        syllabusCodes: data.syllabusCodes,
        level: data.level,
        board: data.board,
        qualification: data.qualification,
        syllabusCode: data.syllabusCode,
      },
      { tutorName: tutor?.user.name },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Enter a subject" },
      { status: 400 },
    );
  }

  const existing = await listTeachingProfilesForUniqueness(gate.profile.id);
  const clash = shouldRejectActiveCanonicalWrite({
    existing,
    nextStatus: "ACTIVE",
    nextSubject: persist.subject,
  });
  if (clash) {
    return NextResponse.json(activeCanonicalConflictPayload(clash), { status: 409 });
  }

  let row;
  try {
    row = await insertTeachingProfile({
      tutorProfileId: gate.profile.id,
      tutorName: tutor?.user.name,
      existingSubjectsCsv: tutor?.subjects,
      input: {
        subject: persist.subject,
        title: persist.title,
        headline: persist.headline,
        description: persist.description,
        rate: persist.rate,
        online: persist.online,
        inPerson: persist.inPerson,
        location: persist.location,
        country: persist.country,
        levels: data.levels,
        boards: data.boards,
        qualifications: data.qualifications,
        syllabusCodes: data.syllabusCodes,
        level: persist.level,
        board: persist.board || undefined,
        qualification: persist.qualification || undefined,
        syllabusCode: persist.syllabusCode || undefined,
      },
    });
  } catch (err) {
    if (err instanceof ActiveCanonicalSubjectConflictError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          canonical: err.canonical,
          existingId: err.existingId,
        },
        { status: 409 },
      );
    }
    throw err;
  }

  await syncTutorBadges(session.user.id);

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
  const row = await prisma.subjectProfile.findFirst({
    where: { id, tutorProfileId: profile.id },
    select: listingSelect,
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "ACTIVE" && row.status !== "ACTIVE") {
    const gate = await canCreateTutorAd(session.user.id);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  const nextSubject = body.subject ? normalizeSubjectLabel(String(body.subject)) : undefined;
  const nextLevel = body.level != null ? String(body.level).slice(0, 80) : row.level;
  const nextBoard =
    body.board !== undefined ? normalizeOptional(String(body.board || "")) : row.board;

  const existing = await listTeachingProfilesForUniqueness(profile.id);
  const uniquenessClash = shouldRejectActiveCanonicalWrite({
    existing,
    excludeId: id,
    nextStatus: status || row.status,
    nextSubject: nextSubject || row.subject,
    previousStatus: row.status,
    previousSubject: row.subject,
  });
  if (uniquenessClash) {
    return NextResponse.json(activeCanonicalConflictPayload(uniquenessClash), { status: 409 });
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
    select: listingSelect,
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

  const taxonomyTouched =
    Boolean(nextSubject) ||
    body.level != null ||
    body.board !== undefined ||
    body.qualification !== undefined ||
    body.syllabusCode !== undefined ||
    Array.isArray(body.levels) ||
    Array.isArray(body.boards) ||
    Array.isArray(body.qualifications) ||
    Array.isArray(body.syllabusCodes);

  let listed = updated;
  if (taxonomyTouched) {
    const caps = capabilitiesFromListingInput({
      levels: body.levels,
      boards: body.boards,
      qualifications: body.qualifications,
      syllabusCodes: body.syllabusCodes,
      level: updated.level,
      board: updated.board,
      qualification: updated.qualification,
      syllabusCode: updated.syllabusCode,
    });
    const scalars = displayScalarsFromCapabilities(caps);
    await replaceSubjectProfileCapabilities(id, caps);
    const canonical = nextSubject
      ? canonicalTeachingSubject(nextSubject).canonical || nextSubject
      : undefined;
    listed = await prisma.subjectProfile.update({
      where: { id },
      data: {
        ...scalars,
        ...(canonical ? { canonicalSubject: canonical } : {}),
      },
      select: listingSelect,
    });
  } else if (nextSubject) {
    listed = await prisma.subjectProfile.update({
      where: { id },
      data: {
        canonicalSubject: canonicalTeachingSubject(nextSubject).canonical || nextSubject,
      },
      select: listingSelect,
    });
  }

  if (nextSubject) {
    listed = await prisma.subjectProfile.update({
      where: { id },
      data: {
        canonicalSubject: canonicalTeachingSubject(nextSubject).canonical || nextSubject,
      },
      select: listingSelect,
    });
  }

  await syncDerivedMasterSubjects(profile.id);

  await syncTutorBadges(session.user.id);

  return NextResponse.json(serializeListing(listed));
}
