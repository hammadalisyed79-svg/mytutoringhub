import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  tutorProfileId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can leave reviews" }, { status: 403 });
  }

  const data = schema.parse(await req.json());
  const profile = await prisma.tutorProfile.findUnique({ where: { id: data.tutorProfileId } });
  if (!profile) return NextResponse.json({ error: "Tutor not found" }, { status: 404 });

  // Require a prior conversation (at least 12h old) to reduce drive-by fake reviews
  const talked = await prisma.conversation.findFirst({
    where: {
      OR: [
        { userAId: session.user.id, userBId: profile.userId },
        { userBId: session.user.id, userAId: profile.userId },
      ],
    },
  });
  if (!talked) {
    return NextResponse.json(
      { error: "Message the tutor before leaving a review" },
      { status: 403 },
    );
  }
  const minAgeMs = 12 * 60 * 60 * 1000;
  if (Date.now() - talked.createdAt.getTime() < minAgeMs) {
    return NextResponse.json(
      {
        error:
          "Please wait at least 12 hours after starting a conversation before leaving a review",
      },
      { status: 403 },
    );
  }

  const review = await prisma.review.upsert({
    where: {
      tutorProfileId_studentId: {
        tutorProfileId: data.tutorProfileId,
        studentId: session.user.id,
      },
    },
    update: { rating: data.rating, comment: data.comment, status: "PENDING" },
    create: {
      tutorProfileId: data.tutorProfileId,
      studentId: session.user.id,
      rating: data.rating,
      comment: data.comment,
      status: "PENDING",
    },
  });

  await prisma.reviewRequest.updateMany({
    where: {
      tutorProfileId: data.tutorProfileId,
      studentId: session.user.id,
      status: "PENDING",
    },
    data: { status: "FULFILLED" },
  });

  return NextResponse.json(review);
}
