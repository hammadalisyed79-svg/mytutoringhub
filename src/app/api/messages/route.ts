import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMessage, canReceiveMessages } from "@/lib/subscription";
import { canPerformAction, recordUsage } from "@/lib/plan-limits";
import { resolveMessageRecipient } from "@/lib/message-recipient";
import { notifyNewMessage } from "@/lib/message-notify";
import { tryAwardStudentReferralMilestone } from "@/lib/hub-points";
import { trackProductEvent } from "@/lib/product-events";
import type { Role } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";

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
      {
        error: "email_unverified",
        message: "Verify your email to send messages",
        upgradeUrl: "/pricing?verify=1",
      },
      { status: 403 },
    );
  }

  const data = startSchema.parse(await req.json());
  const resolved = await resolveMessageRecipient(data.recipientId);
  if (!resolved) {
    return NextResponse.json(
      { error: "Recipient not found", message: "This tutor could not be found." },
      { status: 404 },
    );
  }
  const recipientUserId = resolved.userId;

  if (recipientUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientUserId } });
  if (!recipient) {
    return NextResponse.json(
      { error: "Recipient not found", message: "This tutor could not be found." },
      { status: 404 },
    );
  }

  // Check if this is a new conversation (first contact) to enforce monthly limits
  const role = session.user.role as Role;
  const isNewContact = !await prisma.conversation.findFirst({
    where: {
      OR: [
        { userAId: session.user.id, userBId: recipientUserId },
        { userAId: recipientUserId, userBId: session.user.id },
      ],
    },
  });

  if (isNewContact && role === "STUDENT" && recipient.role === "TUTOR") {
    const check = await canPerformAction(session.user.id, "tutor_contact");
    if (!check.allowed) {
      trackProductEvent("tutor_contact_limit_hit", {
        userId: session.user.id,
        used: check.used,
        limit: check.limit,
      });
      return NextResponse.json(
        {
          error: "limit_exceeded",
          message: `You've used all ${check.limit} tutor contacts this month. Upgrade to Student Pass for unlimited contacts.`,
          upgradeUrl: "/pricing",
          used: check.used,
          limit: check.limit,
        },
        { status: 429 },
      );
    }
  }

  if (isNewContact && role === "TUTOR" && recipient.role === "STUDENT") {
    const check = await canPerformAction(session.user.id, "enquiry_reveal");
    if (!check.allowed) {
      return NextResponse.json(
        {
          error: "limit_exceeded",
          message: `You've used all ${check.limit} enquiry reveals this month. Activate Tutor Pro on Pricing for unlimited student messages.`,
          upgradeUrl: "/pricing",
          used: check.used,
          limit: check.limit,
        },
        { status: 429 },
      );
    }
  }

  // Recipients do not need a paid plan — listed tutors and students can always receive.
  if (recipient.role !== "ADMIN") {
    const recipientOk = await canReceiveMessages(recipient.id, recipient.role as Role);
    if (!recipientOk) {
      return NextResponse.json(
        {
          error:
            recipient.role === "TUTOR"
              ? "This tutor is not currently listed and cannot receive messages"
              : "Recipient cannot receive messages",
        },
        { status: 403 },
      );
    }
  }

  const [userAId, userBId] = orderedPair(session.user.id, recipientUserId);
  let conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  const creatingNewConversation = !conversation;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userAId,
        userBId,
        relatedAdId: data.relatedAdId,
      },
    });
  }

  // Record usage event for the first message in a new conversation
  if (creatingNewConversation) {
    const senderRole = session.user.role as Role;
    if (senderRole === "STUDENT" && recipient.role === "TUTOR") {
      await recordUsage(session.user.id, "tutor_contact");
      trackProductEvent("tutor_contact_started", {
        userId: session.user.id,
        recipientId: recipientUserId,
        relatedAdId: data.relatedAdId,
      });
    } else if (senderRole === "TUTOR" && recipient.role === "STUDENT") {
      await recordUsage(session.user.id, "enquiry_reveal");
      trackProductEvent("enquiry_reveal", {
        userId: session.user.id,
        recipientId: recipientUserId,
      });
    }
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

  const mail = await notifyNewMessage({
    to: recipient.email,
    fromName: session.user.name,
    preview: text || "Sent a photo",
    conversationId: conversation.id,
  });
  if (!mail.sent) {
    console.error("[messages] email not sent", {
      to: recipient.email,
      conversationId: conversation.id,
      error: mail.error,
    });
  }

  if (session.user.role === "STUDENT") {
    void tryAwardStudentReferralMilestone(session.user.id).catch((err) =>
      console.error("[hub-points] student referral milestone failed", err),
    );
  }

  return NextResponse.json({ conversationId: conversation.id, message, emailSent: mail.sent });
}
