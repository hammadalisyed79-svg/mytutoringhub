import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReplyInConversation } from "@/lib/subscription";
import { notifyNewMessage } from "@/lib/message-notify";
import type { Role } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const postSchema = z
  .object({
    body: z.string().max(4000).optional(),
    attachmentUrl: z
      .string()
      .url()
      .refine((u) => u.startsWith("https://"), { message: "Attachment must be an https URL" })
      .optional(),
  })
  .refine((d) => Boolean(d.body?.trim() || d.attachmentUrl), {
    message: "Message text or an image is required",
  });

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.conversation.findUnique({
    where: { id },
    select: { userAId: true, userBId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    existing.userAId !== session.user.id &&
    existing.userBId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.message.updateMany({
    where: {
      conversationId: id,
      senderId: { not: session.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, name: true, role: true } },
      userB: { select: { id: true, name: true, role: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let reviewRequest: { studentId: string; tutorProfileId: string } | null = null;
  if (session.user.role === "TUTOR") {
    const other =
      conversation.userAId === session.user.id ? conversation.userB : conversation.userA;
    if (other.role === "STUDENT") {
      const profile = await prisma.tutorProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (profile) {
        reviewRequest = { studentId: other.id, tutorProfileId: profile.id };
      }
    }
  }

  return NextResponse.json({ ...conversation, reviewRequest });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await canReplyInConversation(session.user.id, session.user.role as Role, id);
  if (!allowed) {
    return NextResponse.json({ error: "Verify your email to send messages" }, { status: 403 });
  }
  const data = postSchema.parse(await req.json());
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = data.body?.trim() || "";
  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: session.user.id,
      body: text,
      attachmentUrl: data.attachmentUrl || null,
    },
  });
  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  const otherId =
    conversation.userAId === session.user.id ? conversation.userBId : conversation.userAId;
  const other = await prisma.user.findUnique({ where: { id: otherId } });
  let emailSent = false;
  if (other) {
    const mail = await notifyNewMessage({
      to: other.email,
      fromName: session.user.name,
      preview: text || "Sent a photo",
      conversationId: id,
    });
    emailSent = mail.sent;
    if (!mail.sent) {
      console.error("[messages] email not sent", {
        to: other.email,
        conversationId: id,
        error: mail.error,
      });
    }
  }

  return NextResponse.json({
    ...message,
    sender: { id: session.user.id, name: session.user.name },
    emailSent,
  });
}
