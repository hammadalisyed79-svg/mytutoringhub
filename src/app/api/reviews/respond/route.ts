import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  reviewId: z.string().min(1),
  response: z.string().min(10).max(2000),
});

/** Tutor may post one public response to a published review on their profile. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = schema.parse(await req.json());
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const review = await prisma.review.findFirst({
    where: { id: data.reviewId, tutorProfileId: profile.id, status: "PUBLISHED" },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (review.tutorResponse) {
    return NextResponse.json({ error: "You already responded to this review" }, { status: 409 });
  }

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      tutorResponse: data.response.trim(),
      tutorRespondedAt: new Date(),
    },
  });
  return NextResponse.json({
    id: updated.id,
    tutorResponse: updated.tutorResponse,
    tutorRespondedAt: updated.tutorRespondedAt,
  });
}
