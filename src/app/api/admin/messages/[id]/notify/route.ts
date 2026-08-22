import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/email";
import { notifyNewMessage } from "@/lib/message-notify";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Admin-only: resend the latest message email alert to the other participant. */
export async function POST(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "RESEND_API_KEY is missing on this deployment. Add it in Vercel and redeploy before email alerts can send.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, name: true, email: true } },
      userB: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const latest = conversation.messages[0];
  if (!latest) {
    return NextResponse.json({ error: "No messages in this thread" }, { status: 400 });
  }

  const recipient =
    latest.senderId === conversation.userAId ? conversation.userB : conversation.userA;

  const mail = await notifyNewMessage({
    to: recipient.email,
    fromName: latest.sender.name,
    preview: latest.body?.trim() || "Sent a photo",
    conversationId: conversation.id,
  });

  if (!mail.sent) {
    return NextResponse.json(
      {
        ok: false,
        to: recipient.email,
        message: mail.error || "Email alert failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    to: recipient.email,
    message: `Email alert sent to ${recipient.email}`,
    id: mail.id,
  });
}
