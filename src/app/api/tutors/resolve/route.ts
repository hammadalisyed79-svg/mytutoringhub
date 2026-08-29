import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listingPath } from "@/lib/subject-profile";
import {
  filterCanonicallyPublicTutors,
  publicListedTutorWhere,
} from "@/lib/tutor-public-eligibility";

const itemSchema = z.object({
  tutorProfileId: z.string().min(1).max(64),
  listingId: z.string().min(1).max(64).optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).max(48),
});

export type ResolvedTutorRef = {
  tutorProfileId: string;
  listingId?: string;
  name: string;
  subject?: string;
  photoUrl?: string | null;
  href: string;
};

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const items = body.items;
  if (items.length === 0) {
    return NextResponse.json({ tutors: [] as ResolvedTutorRef[] });
  }

  const tutorIds = [...new Set(items.map((i) => i.tutorProfileId))];
  const listingIds = [
    ...new Set(items.map((i) => i.listingId).filter((id): id is string => Boolean(id))),
  ];

  const [profilesRaw, listings] = await Promise.all([
    prisma.tutorProfile.findMany({
      where: { id: { in: tutorIds }, ...publicListedTutorWhere() },
      select: {
        id: true,
        active: true,
        forceActive: true,
        photoUrl: true,
        subjects: true,
        headline: true,
        bio: true,
        country: true,
        location: true,
        hourlyRate: true,
        online: true,
        inPerson: true,
        qualifications: true,
        user: {
          select: {
            name: true,
            emailVerified: true,
            suspended: true,
          },
        },
      },
    }),
    listingIds.length > 0
      ? prisma.subjectProfile.findMany({
          where: { id: { in: listingIds } },
          select: {
            id: true,
            status: true,
            subject: true,
            tutorProfileId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const profileById = new Map(
    filterCanonicallyPublicTutors(profilesRaw).map((p) => [p.id, p]),
  );
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const tutors: ResolvedTutorRef[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.tutorProfileId)) continue;
    const profile = profileById.get(item.tutorProfileId);
    if (!profile) continue;

    const name = profile.user.name?.trim();
    if (!name) continue;

    let listingId: string | undefined;
    let subject: string | undefined;
    let href = `/tutors/${profile.id}`;

    if (item.listingId) {
      const listing = listingById.get(item.listingId);
      if (
        listing &&
        listing.tutorProfileId === profile.id &&
        listing.status === "ACTIVE"
      ) {
        listingId = listing.id;
        subject = listing.subject;
        href = listingPath(listing.id);
      }
    }

    if (!subject) {
      subject = (profile.subjects || "")
        .split(",")
        .map((s) => s.trim())
        .find(Boolean);
    }

    seen.add(item.tutorProfileId);
    tutors.push({
      tutorProfileId: profile.id,
      listingId,
      name,
      subject,
      photoUrl: profile.photoUrl,
      href,
    });
  }

  return NextResponse.json({ tutors });
}
