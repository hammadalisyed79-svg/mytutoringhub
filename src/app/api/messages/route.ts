import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMessage } from "@/lib/subscription";
import { sendEmail, newMessageEmailHtml } from "@/lib/email";
import type { Role } from "@/lib/types";
import { z } from "zod";

const startSchema = z.object({
  recipientId: z.string(),
  body: z.string().min(1).max(4000),
  relatedAdId: z.string().optional(),
});

function orderedPair(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: uid }, { userBId: uid }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, name: true, role: true } },
      userB: { select: { id: true, name: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await canMessage(session.user.id, session.user.role as Role);
  if (!allowed) {
    return NextResponse.json(
      { error: "Active subscription required to message" },
      { status: 403 },
    );
  }

  const data = startSchema.parse(await req.json());
  if (data.recipientId === session.user.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: data.recipientId } });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const recipientAllowed = await canMessage(recipient.id, recipient.role as Role);
  if (!recipientAllowed && recipient.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Recipient cannot receive messages without an active plan" },
      { status: 403 },
    );
  }

  const [userAId, userBId] = orderedPair(session.user.id, data.recipientId);
  let conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userAId,
        userBId,
        relatedAdId: data.relatedAdId,
      },
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      body: data.body,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  await sendEmail({
    to: recipient.email,
    subject: "New message on MyTutoringHub",
    html: newMessageEmailHtml(session.user.name, data.body),
  });

  return NextResponse.json({ conversationId: conversation.id, message });
}
