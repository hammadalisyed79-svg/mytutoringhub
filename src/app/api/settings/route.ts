import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { parseDisplayNameInput } from "@/lib/display-name";

const updateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().max(40).optional(),
  password: z.string().min(8).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, emailVerified: true },
  });
  return NextResponse.json(user);
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
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
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
  const id = session.user.id;
  await prisma.user.update({
    where: { id },
    data: {
      name: "Deleted User",
      email: `deleted_${id}@invalid.local`,
      passwordHash: await bcrypt.hash(`deleted-${id}`, 10),
      phone: null,
      suspended: true,
    },
  });
  await prisma.tutorProfile.updateMany({ where: { userId: id }, data: { active: false } });
  await prisma.studentAd.updateMany({ where: { userId: id }, data: { status: "HIDDEN" } });
  return NextResponse.json({ ok: true });
}
