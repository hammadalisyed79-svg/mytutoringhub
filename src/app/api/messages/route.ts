import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMessage } from "@/lib/subscription";
import { sendEmail, newMessageEmailHtml } from "@/lib/email";
import type { Role } from "@/lib/types";
import { z } from "zod";

const startSchema = z
  .object({
    recipientId: z.string(),
    body: z.string().max(4000).optional(),
    attachmentUrl: z
      .string()
      .url()
      .refine((u) => u.startsWith("https://"), { message: "Attachment must be an https URL" })
      .optional(),
    relatedAdId: z.string().optional(),
  })
  .refine((d) => Boolean(d.body?.trim() || d.attachmentUrl), {
    message: "Message text or an image is required",
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
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: uid } } },
        },
      },
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
      { error: "Verified email and an active subscription are required to message" },
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

  const text = data.body?.trim() || "";
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      body: text,
      attachmentUrl: data.attachmentUrl || null,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  await sendEmail({
    to: recipient.email,
    subject: "New message on My Tutoring Hub",
    html: newMessageEmailHtml(session.user.name, text || "Sent a photo"),
  });

  return NextResponse.json({ conversationId: conversation.id, message });
}
