import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { parseDisplayNameInput } from "@/lib/display-name";
import { isValidPhone, normalizePhone } from "@/lib/phone";
const updateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().max(40).optional(),
  password: z.string().min(8).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const h = await headers();
  const countryCode =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    "PK";
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
      tutorProfile: { select: { id: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    hasTutorProfile: Boolean(user.tutorProfile),
    emailVerified: user.emailVerified,
    hasPassword: Boolean(user.passwordHash),
    oauthProviders: user.accounts.map((a) => a.provider),
    countryCode: countryCode.length === 2 ? countryCode.toUpperCase() : "PK",
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let data: z.infer<typeof updateSchema>;
  try {
    data = updateSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Check the required fields" }, { status: 400 });
    }
    throw e;
  }
  let name: string | undefined;
  if (data.name !== undefined) {
    const parsed = parseDisplayNameInput(data.name);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    name = parsed.name;
  }
  const h = await headers();
  const countryCode =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    "PK";
  let phone: string | null | undefined;
  if (data.phone !== undefined) {
    const trimmed = data.phone.trim();
    if (!trimmed) {
      phone = null;
    } else {
      const normalized = normalizePhone(trimmed, countryCode);
      if (!isValidPhone(normalized)) {
        return NextResponse.json({ error: "Enter a valid phone number for your country." }, { status: 400 });
      }
      phone = normalized;
    }
  }
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(data.password
        ? { passwordHash: await bcrypt.hash(data.password, 10) }
        : {}),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, emailVerified: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be self-deactivated here." }, { status: 403 });
  }
  const id = session.user.id;

  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId: id },
    select: { id: true },
  });

  if (tutor) {
    await prisma.subjectProfile.deleteMany({ where: { tutorProfileId: tutor.id } });
    await prisma.tutorAd.deleteMany({ where: { tutorProfileId: tutor.id } }).catch(() => undefined);
    await prisma.tutorProfile.update({
      where: { id: tutor.id },
      data: {
        active: false,
        forceActive: false,
        bio: "",
        headline: null,
        photoUrl: null,
        subjects: "",
        expertise: null,
        qualifications: null,
        teachingMethod: null,
        languages: null,
        levels: null,
        availability: null,
        videoUrl: null,
        introVideoUrl: null,
        phone: null,
      },
    });
  }

  await prisma.studentAd.updateMany({ where: { userId: id }, data: { status: "HIDDEN" } });

  await prisma.user.update({
    where: { id },
    data: {
      name: "Deleted User",
      email: `deleted_${id}@invalid.local`,
      passwordHash: await bcrypt.hash(`deleted-${id}`, 10),
      phone: null,
      suspended: true,
      role: "STUDENT",
    },
  });

  return NextResponse.json({ ok: true });
}
