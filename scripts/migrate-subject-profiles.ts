/**
 * One-time / idempotent migration: TutorAd + TutorProfile.subjects → SubjectProfile.
 *
 * Usage: npx tsx scripts/migrate-subject-profiles.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  defaultSubjectProfileTitle,
  normalizeSubjectLabel,
  splitSubjectsCsv,
} from "../src/lib/subject-profile";

const prisma = new PrismaClient();

async function ensureSubjectProfile(opts: {
  tutorProfileId: string;
  subject: string;
  title: string;
  description?: string | null;
  level?: string;
  location: string;
  country?: string | null;
  online: boolean;
  inPerson: boolean;
  rate: number;
  status?: string;
  highlightedUntil?: Date | null;
  boostUntil?: Date | null;
  headline?: string | null;
}) {
  const subject = normalizeSubjectLabel(opts.subject);
  if (!subject) return { created: false, skipped: true as const };

  const existing = await prisma.subjectProfile.findFirst({
    where: {
      tutorProfileId: opts.tutorProfileId,
      subject: { equals: subject, mode: "insensitive" },
    },
  });
  if (existing) return { created: false, id: existing.id };

  const row = await prisma.subjectProfile.create({
    data: {
      tutorProfileId: opts.tutorProfileId,
      subject,
      title: opts.title.slice(0, 120),
      headline: opts.headline || null,
      description: opts.description || null,
      level: opts.level || "All levels",
      location: opts.location || "Online",
      country: opts.country || null,
      online: opts.online,
      inPerson: opts.inPerson,
      rate: opts.rate,
      status: opts.status || "ACTIVE",
      highlightedUntil: opts.highlightedUntil || null,
      boostUntil: opts.boostUntil || null,
    },
  });
  return { created: true, id: row.id };
}

async function main() {
  const profiles = await prisma.tutorProfile.findMany({
    include: {
      user: { select: { name: true } },
      ads: true,
    },
  });

  let fromAds = 0;
  let fromCsv = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const name = profile.user.name;

    for (const ad of profile.ads) {
      const result = await ensureSubjectProfile({
        tutorProfileId: profile.id,
        subject: ad.subject,
        title: ad.title || defaultSubjectProfileTitle(ad.subject, name),
        description: ad.description,
        level: ad.level,
        location: ad.location || profile.location,
        country: profile.country,
        online: ad.online,
        inPerson: ad.inPerson,
        rate: ad.rate || profile.hourlyRate,
        status: ad.status,
        highlightedUntil: ad.highlightedUntil ?? profile.highlightedUntil,
        boostUntil: ad.boostUntil ?? profile.boostUntil,
        headline: profile.headline,
      });
      if (result.created) fromAds += 1;
      else skipped += 1;
    }

    const subjects = splitSubjectsCsv(profile.subjects);
    let index = 0;
    for (const subject of subjects) {
      const isFirst = index === 0;
      index += 1;
      const result = await ensureSubjectProfile({
        tutorProfileId: profile.id,
        subject,
        title: defaultSubjectProfileTitle(subject, name),
        description: profile.bio?.slice(0, 4000) || null,
        level: "All levels",
        location: profile.location || "Online",
        country: profile.country,
        online: profile.online,
        inPerson: profile.inPerson,
        rate: profile.hourlyRate || 1500,
        status: profile.active ? "ACTIVE" : "PAUSED",
        // First subject inherits account boost/highlight; extras start clean.
        highlightedUntil: isFirst ? profile.highlightedUntil : null,
        boostUntil: isFirst ? profile.boostUntil : null,
        headline: profile.headline,
      });
      if (result.created) fromCsv += 1;
      else skipped += 1;
    }

    // Tutors with no subjects CSV and no ads still get a placeholder Online listing.
    if (subjects.length === 0 && profile.ads.length === 0) {
      const result = await ensureSubjectProfile({
        tutorProfileId: profile.id,
        subject: "General tutoring",
        title: defaultSubjectProfileTitle("General tutoring", name),
        description: profile.bio?.slice(0, 4000) || null,
        location: profile.location || "Online",
        country: profile.country,
        online: profile.online,
        inPerson: profile.inPerson,
        rate: profile.hourlyRate || 1500,
        status: "PAUSED",
        highlightedUntil: profile.highlightedUntil,
        boostUntil: profile.boostUntil,
        headline: profile.headline,
      });
      if (result.created) fromCsv += 1;
      else skipped += 1;
    }
  }

  const total = await prisma.subjectProfile.count();
  console.log(
    JSON.stringify(
      {
        ok: true,
        tutorProfiles: profiles.length,
        createdFromAds: fromAds,
        createdFromSubjectsCsv: fromCsv,
        skippedExisting: skipped,
        subjectProfilesTotal: total,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
