import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const RATE_LIMIT = 40;
const WINDOW_MS = 24 * 60 * 60 * 1000;

const SYSTEM = `You are the My Tutoring Hub Study Assistant — a supportive study coach for students and tutors.
Help with explaining concepts, practice questions, study plans, exam tips, and clarifying homework.
Be clear, encouraging, and age-appropriate. Use short paragraphs and bullet lists when helpful.
Do not claim to be a live human tutor or arrange lessons/payments.
Refuse requests that are unrelated to learning, or that ask for illegal/harmful content.
If the user needs a real tutor, suggest searching tutors on MyTutoringHub.`;

const schema = z.object({
  message: z.string().min(1).max(4000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configured = Boolean(process.env.OPENAI_API_KEY);
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

  if (!process.env.OPENAI_API_KEY) {
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

  await prisma.aiMessage.create({
    data: { userId: session.user.id, role: "user", content: message },
  });

  const recent = await prisma.aiMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const chronological = recent.reverse();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let reply = "Sorry — I could not generate a reply right now.";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM },
        ...chronological.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });
    reply = completion.choices[0]?.message?.content?.trim() || reply;
  } catch (err) {
    console.error("OpenAI chat error", err);
    return NextResponse.json({ error: "Assistant request failed" }, { status: 502 });
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
