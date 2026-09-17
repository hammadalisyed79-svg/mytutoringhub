import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  aiChatPayload,
  clearAiChatHistory,
  countUserAiMessages,
  getAiChatHistory,
  sendAiChatMessage,
} from "@/lib/ai-chat";
import {
  AI_STUDY_KIND,
  AI_STUDY_RATE_LIMIT,
  AI_STUDY_SYSTEM,
  AI_WINDOW_MS,
} from "@/lib/ai-support";
import { getSiteSettings } from "@/lib/site-settings";
import { canUseStudyAssistant } from "@/lib/subscription";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  message: z.string().min(1).max(4000),
});

async function studyAccess(userId: string, role: Role) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, suspended: true },
  });
  if (!user || user.suspended) {
    return { ok: false as const, status: 403, error: "Account suspended" };
  }
  if (role !== "ADMIN" && !user.emailVerified) {
    return { ok: false as const, status: 403, error: "Verify your email to use the study assistant" };
  }
  if (!(await canUseStudyAssistant(userId, role))) {
    return {
      ok: false as const,
      status: 403,
      error: "Student Pro is required for the study assistant",
      upgradeUrl: "/pricing",
    };
  }
  const settings = await getSiteSettings();
  if (settings.disableAiAssistant && role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Study assistant is temporarily disabled" };
  }
  return { ok: true as const };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await studyAccess(session.user.id, session.user.role as Role);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, ...(access.upgradeUrl ? { upgradeUrl: access.upgradeUrl } : {}) },
      { status: access.status },
    );
  }

  const since = new Date(Date.now() - AI_WINDOW_MS);
  const used = await countUserAiMessages(session.user.id, AI_STUDY_KIND, since);
  const history = await getAiChatHistory(session.user.id, AI_STUDY_KIND, 40);

  return NextResponse.json(
    aiChatPayload(
      Boolean(process.env.OPENAI_API_KEY?.trim()),
      used,
      AI_STUDY_RATE_LIMIT,
      history,
    ),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await studyAccess(session.user.id, session.user.role as Role);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, ...(access.upgradeUrl ? { upgradeUrl: access.upgradeUrl } : {}) },
      { status: access.status },
    );
  }

  const { message } = schema.parse(await req.json());
  const result = await sendAiChatMessage({
    userId: session.user.id,
    kind: AI_STUDY_KIND,
    message,
    systemPrompt: AI_STUDY_SYSTEM,
    rateLimit: AI_STUDY_RATE_LIMIT,
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

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await studyAccess(session.user.id, session.user.role as Role);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, ...(access.upgradeUrl ? { upgradeUrl: access.upgradeUrl } : {}) },
      { status: access.status },
    );
  }

  await clearAiChatHistory(session.user.id, AI_STUDY_KIND);
  return NextResponse.json({ ok: true });
}
