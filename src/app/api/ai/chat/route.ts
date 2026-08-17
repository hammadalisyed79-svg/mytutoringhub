import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const RATE_LIMIT = 40;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const PRIMARY_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const FALLBACK_MODELS = ["gpt-4o-mini", "gpt-3.5-turbo"].filter(
  (m, i, arr) => m !== PRIMARY_MODEL && arr.indexOf(m) === i,
);

const SYSTEM = `You are the My Tutoring Hub Study Assistant — a supportive study coach for students and tutors.
Help with explaining concepts, practice questions, study plans, exam tips, and clarifying homework.
Be clear, encouraging, and age-appropriate. Use short paragraphs and bullet lists when helpful.
Do not claim to be a live human tutor or arrange lessons/payments.
Refuse requests that are unrelated to learning, or that ask for illegal/harmful content.
If the user needs a real tutor, suggest searching tutors on MyTutoringHub.`;

const schema = z.object({
  message: z.string().min(1).max(4000),
});

type SafeOpenAiError = {
  error: string;
  code?: string;
  status: number;
};

function mapOpenAiError(err: unknown): SafeOpenAiError {
  if (err instanceof OpenAI.APIError) {
    const code = typeof err.code === "string" ? err.code : undefined;
    const raw =
      (typeof err.error === "object" &&
        err.error &&
        "message" in err.error &&
        typeof (err.error as { message?: unknown }).message === "string" &&
        (err.error as { message: string }).message) ||
      err.message ||
      "Assistant request failed";

    // Prefer clear, safe messages for common account/config failures.
    if (
      code === "insufficient_quota" ||
      /insufficient.?quota|exceeded your current quota|billing hard limit/i.test(raw)
    ) {
      return {
        error:
          "OpenAI account has no credits or billing is not set up. Add a payment method and credits at platform.openai.com/settings/organization/billing, then try again.",
        code: code || "insufficient_quota",
        status: 502,
      };
    }
    if (code === "invalid_api_key" || err.status === 401) {
      return {
        error:
          "OpenAI API key is invalid. Check OPENAI_API_KEY in Vercel (no spaces or newlines) and redeploy.",
        code: code || "invalid_api_key",
        status: 502,
      };
    }
    if (code === "model_not_found" || /model.*not.*found|does not exist/i.test(raw)) {
      return {
        error:
          "OpenAI model is unavailable. Check OPENAI_MODEL (default gpt-4o-mini) and that your account can access it.",
        code: code || "model_not_found",
        status: 502,
      };
    }
    if (err.status === 429) {
      return {
        error: "OpenAI rate limit reached. Please wait a minute and try again.",
        code: code || "rate_limit_exceeded",
        status: 502,
      };
    }

    // Strip noisy status prefixes like "429 ..." from SDK messages; expose code separately.
    const cleaned = raw.replace(/^\d{3}\s+/, "").trim();
    return {
      error: cleaned || "Assistant request failed",
      code,
      status: 502,
    };
  }

  if (err instanceof Error && err.message) {
    return { error: "Assistant request failed. Please try again shortly.", status: 502 };
  }

  return { error: "Assistant request failed", status: 502 };
}

async function createCompletion(
  openai: OpenAI,
  chronological: { role: string; content: string }[],
  model: string,
) {
  return openai.chat.completions.create({
    model,
    temperature: 0.6,
    messages: [
      { role: "system", content: SYSTEM },
      ...chronological.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, role: true, suspended: true },
  });
  if (user?.suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }
  if (session.user.role !== "ADMIN" && !user?.emailVerified) {
    return NextResponse.json({ error: "Verify your email to use the study assistant" }, { status: 403 });
  }

  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const since = new Date(Date.now() - WINDOW_MS);
  const used = await prisma.aiMessage.count({
    where: { userId: session.user.id, role: "user", createdAt: { gte: since } },
  });
  const history = await prisma.aiMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  return NextResponse.json({
    configured,
    used,
    limit: RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - used),
    messages: history.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }
  if (session.user.role !== "ADMIN" && !user.emailVerified) {
    return NextResponse.json({ error: "Verify your email to use the study assistant" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Study assistant is not configured" }, { status: 503 });
  }

  const { message } = schema.parse(await req.json());
  const since = new Date(Date.now() - WINDOW_MS);
  const used = await prisma.aiMessage.count({
    where: { userId: session.user.id, role: "user", createdAt: { gte: since } },
  });
  if (used >= RATE_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached (${RATE_LIMIT} messages / 24h). Try again later.` },
      { status: 429 },
    );
  }

  const userMsg = await prisma.aiMessage.create({
    data: { userId: session.user.id, role: "user", content: message },
  });

  const recent = await prisma.aiMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const chronological = recent.reverse();

  const openai = new OpenAI({ apiKey });
  let reply = "Sorry — I could not generate a reply right now.";
  try {
    const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
    let completion: Awaited<ReturnType<typeof createCompletion>> | null = null;
    let lastErr: unknown;
    for (const model of modelsToTry) {
      try {
        completion = await createCompletion(openai, chronological, model);
        break;
      } catch (err) {
        lastErr = err;
        const mapped = mapOpenAiError(err);
        const canFallback =
          mapped.code === "model_not_found" || /model.*not.*found|does not exist/i.test(mapped.error);
        if (!canFallback) throw err;
      }
    }
    if (!completion) throw lastErr;
    reply = completion.choices[0]?.message?.content?.trim() || reply;
  } catch (err) {
    console.error("OpenAI chat error", err);
    // Avoid orphan user messages that count toward the daily limit with no reply.
    await prisma.aiMessage.delete({ where: { id: userMsg.id } }).catch(() => undefined);
    const mapped = mapOpenAiError(err);
    return NextResponse.json(
      { error: mapped.error, ...(mapped.code ? { code: mapped.code } : {}) },
      { status: mapped.status },
    );
  }

  const assistant = await prisma.aiMessage.create({
    data: { userId: session.user.id, role: "assistant", content: reply },
  });

  return NextResponse.json({
    message: {
      id: assistant.id,
      role: assistant.role,
      content: assistant.content,
      createdAt: assistant.createdAt,
    },
    remaining: Math.max(0, RATE_LIMIT - used - 1),
  });
}
