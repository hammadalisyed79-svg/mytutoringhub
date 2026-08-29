import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const postSchema = z.object({
  blockedUserId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { blocked: { select: { id: true, name: true } } },
    take: 100,
  });
  return NextResponse.json({
    blocks: blocks.map((b) => ({
      id: b.id,
      blockedUserId: b.blockedId,
      name: b.blocked.name,
      reason: b.reason,
      createdAt: b.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = postSchema.parse(await req.json());
  if (data.blockedUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({
    where: { id: data.blockedUserId },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const block = await prisma.userBlock.upsert({
    where: {
      blockerId_blockedId: { blockerId: session.user.id, blockedId: data.blockedUserId },
    },
    create: {
      blockerId: session.user.id,
      blockedId: data.blockedUserId,
      reason: data.reason?.trim() || null,
    },
    update: { reason: data.reason?.trim() || null },
  });
  return NextResponse.json(block);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const blockedUserId = searchParams.get("blockedUserId");
  if (!blockedUserId) return NextResponse.json({ error: "blockedUserId required" }, { status: 400 });
  await prisma.userBlock.deleteMany({
    where: { blockerId: session.user.id, blockedId: blockedUserId },
  });
  return NextResponse.json({ ok: true });
}
