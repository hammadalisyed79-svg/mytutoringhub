import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  headline: z.string().max(120).optional(),
  bio: z.string().min(20),
  subjects: z.string().min(1),
  hourlyRate: z.number().min(500).max(20000),
  location: z.string().min(1),
  online: z.boolean(),
  inPerson: z.boolean(),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = schema.parse(await req.json());
  const profile = await prisma.tutorProfile.upsert({
    where: { userId: session.user.id },
    update: {
      headline: data.headline || null,
      bio: data.bio,
      subjects: data.subjects,
      hourlyRate: data.hourlyRate,
      location: data.location,
      online: data.online,
      inPerson: data.inPerson,
      photoUrl: data.photoUrl || null,
    },
    create: {
      userId: session.user.id,
      headline: data.headline || null,
      bio: data.bio,
      subjects: data.subjects,
      hourlyRate: data.hourlyRate,
      location: data.location,
      online: data.online,
      inPerson: data.inPerson,
      photoUrl: data.photoUrl || null,
      active: false,
    },
  });

  return NextResponse.json(profile);
}
