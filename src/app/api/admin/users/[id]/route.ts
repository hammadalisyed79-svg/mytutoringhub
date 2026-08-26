import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { AdminActionError, runAdminAction } from "@/lib/admin-actions";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tutorProfile: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { messages: true, studentAds: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash, ...safeUser } = user;
  return NextResponse.json({ ...safeUser, hasPassword: Boolean(passwordHash) });
}

export async function POST(req: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const result = await runAdminAction(session.user.id, { ...body, id: body.id || id });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    if (err instanceof AdminActionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runAdminAction(session.user.id, {
      action: "delete_user",
      id,
      confirmEmail: body.confirmEmail,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminActionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
