import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  aiChatPayload,
  countUserAiMessages,
  getAiChatHistory,
  sendAiChatMessage,
} from "@/lib/ai-chat";
import {
  AI_SUPPORT_KIND,
  AI_SUPPORT_RATE_LIMIT,
  AI_SUPPORT_SYSTEM,
  AI_WINDOW_MS,
} from "@/lib/ai-support";
import { getSiteSettings } from "@/lib/site-settings";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  message: z.string().min(1).max(4000),
});

async function supportAccess(userId: string, role: Role) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true },
  });
  if (!user || user.suspended) {
    return { ok: false as const, status: 403, error: "Account suspended" };
  }
  const settings = await getSiteSettings();
  if (settings.disableAiAssistant && role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "AI support is temporarily unavailable" };
  }
  return { ok: true as const };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await supportAccess(session.user.id, session.user.role as Role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const since = new Date(Date.now() - AI_WINDOW_MS);
  const used = await countUserAiMessages(session.user.id, AI_SUPPORT_KIND, since);
  const history = await getAiChatHistory(session.user.id, AI_SUPPORT_KIND, 40);

  return NextResponse.json(
    aiChatPayload(
      Boolean(process.env.OPENAI_API_KEY?.trim()),
      used,
      AI_SUPPORT_RATE_LIMIT,
      history,
    ),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await supportAccess(session.user.id, session.user.role as Role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { message } = schema.parse(await req.json());
  const result = await sendAiChatMessage({
    userId: session.user.id,
    kind: AI_SUPPORT_KIND,
    message,
    systemPrompt: AI_SUPPORT_SYSTEM,
    rateLimit: AI_SUPPORT_RATE_LIMIT,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    );
  }

  return NextResponse.json({
    message: result.message,
    remaining: result.remaining,
  });
}
