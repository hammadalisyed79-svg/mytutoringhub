import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  matchSurveyEventName,
  shouldOfferMatchSurvey,
  type MatchSurveyAnswer,
} from "@/lib/match-survey";
import { trackProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const postSchema = z.object({
  answer: z.enum(["YES", "NO", "SKIP"]),
});

async function loadEligibility(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userAId: true, userBId: true },
  });
  if (!conversation) return { error: "Not found" as const, status: 404 as const };
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  const [messages, existing] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      select: { senderId: true },
    }),
    prisma.marketplaceMatchFeedback.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { id: true },
    }),
  ]);

  const senders = new Set(messages.map((m) => m.senderId));
  const eligible = shouldOfferMatchSurvey({
    messageCount: messages.length,
    distinctSenderCount: senders.size,
    alreadyResponded: Boolean(existing),
  });

  return { conversation, eligible, existing };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const result = await loadEligibility(id, session.user.id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      eligible: result.eligible,
      answered: Boolean(result.existing),
    });
  } catch (err) {
    console.error("[match-feedback] get failed", err);
    return NextResponse.json({ eligible: false, answered: false });
  }
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const data = postSchema.parse(await req.json());
  const answer = data.answer as MatchSurveyAnswer;

  try {
    const result = await loadEligibility(id, session.user.id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (result.existing) {
      return NextResponse.json({ ok: true, already: true });
    }
    if (!result.eligible && answer !== "SKIP") {
      return NextResponse.json(
        { error: "not_eligible", message: "Survey is not available for this conversation yet." },
        { status: 400 },
      );
    }

    const role = session.user.role === "TUTOR" ? "TUTOR" : "STUDENT";
    await prisma.marketplaceMatchFeedback.create({
      data: {
        conversationId: id,
        userId: session.user.id,
        role,
        answer,
      },
    });

    trackProductEvent("match_survey_response", {
      userId: session.user.id,
      role,
      answer,
      conversationId: id,
    });

    return NextResponse.json({
      ok: true,
      gaEvent: matchSurveyEventName(role),
      answer,
    });
  } catch (err) {
    console.error("[match-feedback] post failed", err);
    return NextResponse.json(
      { error: "unavailable", message: "Could not save feedback right now." },
      { status: 503 },
    );
  }
}
