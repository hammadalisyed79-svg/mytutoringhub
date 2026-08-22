import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { completeWithFallback, mapOpenAiError } from "@/lib/ai-openai";
import {
  AI_STUDY_KIND,
  AI_SUPPORT_KIND,
  AI_WINDOW_MS,
} from "@/lib/ai-support";

export type AiChatKind = typeof AI_STUDY_KIND | typeof AI_SUPPORT_KIND;

export async function countUserAiMessages(userId: string, kind: AiChatKind, since: Date) {
  return prisma.aiMessage.count({
    where: { userId, kind, role: "user", createdAt: { gte: since } },
  });
}

export async function getAiChatHistory(userId: string, kind: AiChatKind, take = 40) {
  return prisma.aiMessage.findMany({
    where: { userId, kind },
    orderBy: { createdAt: "asc" },
    take,
  });
}

export async function sendAiChatMessage({
  userId,
  kind,
  message,
  systemPrompt,
  rateLimit,
}: {
  userId: string;
  kind: AiChatKind;
  message: string;
  systemPrompt: string;
  rateLimit: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false as const, status: 503, error: "AI chat is not configured" };
  }

  const since = new Date(Date.now() - AI_WINDOW_MS);
  const used = await countUserAiMessages(userId, kind, since);
  if (used >= rateLimit) {
    return {
      ok: false as const,
      status: 429,
      error: `Daily limit reached (${rateLimit} messages / 24h). Try again later or email admin@mytutoringhub.com.`,
    };
  }

  const userMsg = await prisma.aiMessage.create({
    data: { userId, kind, role: "user", content: message },
  });

  const recent = await prisma.aiMessage.findMany({
    where: { userId, kind },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const chronological = recent.reverse();

  const openai = new OpenAI({ apiKey });
  let reply = "Sorry — I could not generate a reply right now.";
  try {
    const completion = await completeWithFallback(openai, systemPrompt, chronological);
    reply = completion.choices[0]?.message?.content?.trim() || reply;
  } catch (err) {
    console.error(`OpenAI ${kind} chat error`, err);
    await prisma.aiMessage.delete({ where: { id: userMsg.id } }).catch(() => undefined);
    const mapped = mapOpenAiError(err);
    return {
      ok: false as const,
      status: mapped.status,
      error: mapped.error,
      code: mapped.code,
    };
  }

  const assistant = await prisma.aiMessage.create({
    data: { userId, kind, role: "assistant", content: reply },
  });

  return {
    ok: true as const,
    message: {
      id: assistant.id,
      role: assistant.role,
      content: assistant.content,
      createdAt: assistant.createdAt,
    },
    remaining: Math.max(0, rateLimit - used - 1),
  };
}

export function aiChatPayload(
  configured: boolean,
  used: number,
  rateLimit: number,
  history: { id: string; role: string; content: string; createdAt: Date }[],
) {
  return {
    configured,
    used,
    limit: rateLimit,
    remaining: Math.max(0, rateLimit - used),
    messages: history.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}
