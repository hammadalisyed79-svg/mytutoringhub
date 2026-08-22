import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  recommenderName: z.string().trim().min(2).max(80),
  recommenderEmail: z.string().trim().email().optional().or(z.literal("")),
  relationship: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().min(20).max(2000),
  proofUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "Proof must be an https URL" })
    .optional()
    .or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });
  }

  const items = await prisma.tutorRecommendation.findMany({
    where: { tutorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Only tutors can submit recommendations" }, { status: 403 });
  }

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Create your tutor profile first" }, { status: 404 });
  }

  const data = submitSchema.parse(await req.json());
  const pendingCount = await prisma.tutorRecommendation.count({
    where: { tutorProfileId: profile.id, status: "PENDING" },
  });
  if (pendingCount >= 3) {
    return NextResponse.json(
      {
        error:
          "You already have recommendations waiting for review. Wait for admin approval before submitting more.",
      },
      { status: 429 },
    );
  }

  const item = await prisma.tutorRecommendation.create({
    data: {
      tutorProfileId: profile.id,
      recommenderName: data.recommenderName,
      recommenderEmail: data.recommenderEmail?.trim() || null,
      relationship: data.relationship?.trim() || null,
      comment: data.comment,
      proofUrl: data.proofUrl?.trim() || null,
      status: "PENDING",
    },
  });

  return NextResponse.json(item, { status: 201 });
}
