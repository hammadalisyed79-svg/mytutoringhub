import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  headline: z.string().max(120).optional(),
  bio: z.string().min(20),
  subjects: z.string().min(1),
  hourlyRate: z.number().min(500).max(50000),
  location: z.string().min(1),
  online: z.boolean(),
  inPerson: z.boolean(),
  photoUrl: z.string().optional().or(z.literal("")),
  qualifications: z.string().max(2000).optional(),
  teachingMethod: z.string().max(2000).optional(),
  languages: z.string().max(200).optional(),
  levels: z.string().max(200).optional(),
  availability: z.string().max(500).optional(),
  videoUrl: z.string().optional().or(z.literal("")),
  offersFreeTrial: z.boolean().optional(),
  phone: z.string().max(40).optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = schema.parse(await req.json());

  const rawPhoto = (data.photoUrl || "").trim();
  if (rawPhoto.startsWith("data:")) {
    return NextResponse.json(
      { error: "Upload photos via the file picker (Blob). Data URLs are not stored." },
      { status: 400 },
    );
  }
  if (rawPhoto && !/^https:\/\//i.test(rawPhoto)) {
    return NextResponse.json({ error: "Photo must be an https:// URL" }, { status: 400 });
  }
  const photoUrl = rawPhoto || null;

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
      photoUrl,
      qualifications: data.qualifications || null,
      teachingMethod: data.teachingMethod || null,
      languages: data.languages || null,
      levels: data.levels || null,
      availability: data.availability || null,
      videoUrl: data.videoUrl || null,
      offersFreeTrial: Boolean(data.offersFreeTrial),
      phone: data.phone || null,
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
      photoUrl,
      qualifications: data.qualifications || null,
      teachingMethod: data.teachingMethod || null,
      languages: data.languages || null,
      levels: data.levels || null,
      availability: data.availability || null,
      videoUrl: data.videoUrl || null,
      offersFreeTrial: Boolean(data.offersFreeTrial),
      phone: data.phone || null,
      active: false,
    },
  });

  // Ensure at least one subject ad exists for search coverage.
  const adCount = await prisma.tutorAd.count({ where: { tutorProfileId: profile.id } });
  if (adCount === 0) {
    const firstSubject = profile.subjects.split(",")[0]?.trim() || "General";
    await prisma.tutorAd.create({
      data: {
        tutorProfileId: profile.id,
        subject: firstSubject,
        title: profile.headline || `${firstSubject} lessons`,
        level: profile.levels || "All levels",
        location: profile.location,
        online: profile.online,
        inPerson: profile.inPerson,
        rate: profile.hourlyRate,
        description: profile.bio.slice(0, 500),
        status: "ACTIVE",
      },
    });
  }

  return NextResponse.json(profile);
}
