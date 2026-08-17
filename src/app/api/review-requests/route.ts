import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  studentId: z.string(),
  tutorProfileId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Only tutors can request reviews" }, { status: 403 });
  }
  const data = schema.parse(await req.json());
  const profile = await prisma.tutorProfile.findFirst({
    where: { id: data.tutorProfileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const talked = await prisma.conversation.findFirst({
    where: {
      OR: [
        { userAId: session.user.id, userBId: data.studentId },
        { userBId: session.user.id, userAId: data.studentId },
      ],
    },
  });
  if (!talked) {
    return NextResponse.json({ error: "You can only request reviews from students you messaged" }, { status: 403 });
  }

  const item = await prisma.reviewRequest.upsert({
    where: {
      tutorProfileId_studentId: {
        tutorProfileId: data.tutorProfileId,
        studentId: data.studentId,
      },
    },
    update: { status: "PENDING" },
    create: {
      tutorUserId: session.user.id,
      studentId: data.studentId,
      tutorProfileId: data.tutorProfileId,
      status: "PENDING",
    },
  });
  return NextResponse.json(item);
}
