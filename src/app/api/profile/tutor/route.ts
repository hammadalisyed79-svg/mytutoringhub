import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  citiesForCountry,
  expertiseForSubjects,
  GENERIC_EXPERTISE,
  joinCsv,
  splitCsv,
  tutorCountries,
  tutorLanguageOptions,
  tutorLevelOptions,
} from "@/lib/tutor-catalog";
import { curriculumLevels } from "@/lib/curriculum";
import { countryByName } from "@/lib/markets";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { catalogSubjectNames, mergeSubjectNames } from "@/lib/subject-catalog";
import { parseAvailability, serializeAvailability } from "@/lib/availability";
import { parseDisplayNameInput } from "@/lib/display-name";
import { isTutorProfileListable, syncTutorBadges } from "@/lib/subscription";
import { isAllowedBlobUrl } from "@/lib/blob-url";
import { tryAwardProfileCompleteBonus } from "@/lib/hub-points";
import { sendTutorProfileLiveEmail } from "@/lib/email-nurture";

const schema = z
  .object({
    name: z.string().min(1, "Enter the name students see"),
    headline: z
      .string()
      .trim()
      .min(8, "Write a short headline (at least 8 characters)")
      .max(120, "Headline must be 120 characters or less"),
    bio: z
      .string()
      .trim()
      .min(40, "Tell students a bit more about how you teach (at least 40 characters)")
      .max(4000, "Bio must be 4000 characters or less"),
    subjects: z.string().trim().min(2, "Select at least one subject"),
    hourlyRate: z
      .number()
      .min(500, "Hourly rate must be at least 500 PKR")
      .max(50000, "Hourly rate is too high"),
    location: z.string().trim().min(2, "Select your city, or Online"),
    country: z.string().trim().min(2, "Select your country").max(80),
    expertise: z.string().max(1000).optional(),
    online: z.boolean(),
    inPerson: z.boolean(),
    photoUrl: z
      .string()
      .trim()
      .min(1, "Upload a profile photo")
      .refine((u) => /^https:\/\//i.test(u), { message: "Upload a profile photo" }),
    photoCropX: z.coerce.number().min(-100).max(100).optional().default(0),
    photoCropY: z.coerce.number().min(-100).max(100).optional().default(0),
    photoCropZoom: z.coerce.number().min(1).max(3).optional().default(1),
    qualifications: z
      .string()
      .trim()
      .min(1, "Enter your highest qualification")
      .max(2000),    teachingMethod: z.string().max(2000).optional(),
    languages: z.string().max(500).optional(),
    levels: z.string().max(500).optional(),
    availability: z.string().max(4000).optional(),
    experienceYears: z.coerce.number().int().min(0).max(40).optional().nullable(),
    videoUrl: z.string().max(500).optional().or(z.literal("")),
    introVideoUrl: z.string().max(500).optional().or(z.literal("")),
    offersFreeTrial: z.boolean().optional(),
    phone: z.string().max(40).optional(),
  })
  .refine((d) => d.online || d.inPerson, {
    message: "Choose online, in person, or both",
    path: ["online"],
  });

function pickKnown(values: string[], catalog: string[]) {
  const canon = new Map(catalog.map((item) => [item.toLowerCase(), item]));
  const out: string[] = [];
  for (const value of values) {
    const match = canon.get(value.toLowerCase());
    if (match && !out.some((item) => item.toLowerCase() === match.toLowerCase())) out.push(match);
  }
  return out;
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = schema.parse(await req.json());
    const parsedName = parseDisplayNameInput(data.name);
    if (!parsedName.ok) {
      return NextResponse.json({ error: parsedName.error }, { status: 400 });
    }

    const rawPhoto = (data.photoUrl || "").trim();
    if (rawPhoto.startsWith("data:")) {
      return NextResponse.json(
        { error: "Upload photos via the file picker. Data URLs are not stored." },
        { status: 400 },
      );
    }
    if (rawPhoto && !/^https:\/\//i.test(rawPhoto)) {
      return NextResponse.json({ error: "Photo must be an https:// URL" }, { status: 400 });
    }
    if (!rawPhoto) {
      return NextResponse.json({ error: "A profile photo is required" }, { status: 400 });
    }
    if (!isAllowedBlobUrl(rawPhoto)) {
      return NextResponse.json(
        { error: "Upload your photo via the file picker on this page." },
        { status: 400 },
      );
    }
    const photoUrl = rawPhoto;

    const listed = await prisma.subject.findMany({ select: { name: true } });
    const existing = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
    });
    const subjectCatalog = mergeSubjectNames(
      listed.map((row) => row.name),
      catalogSubjectNames(),
      splitCsv(existing?.subjects),
    );
    const subjectParts = splitCsv(data.subjects);
    if (!subjectParts.length) {
      return NextResponse.json({ error: "Select at least one subject from the catalog" }, { status: 400 });
    }
    const subjects = pickKnown(subjectParts, subjectCatalog);
    if (subjects.length !== subjectParts.length) {
      return NextResponse.json({ error: "Choose subjects from the listed catalog only" }, { status: 400 });
    }

    if (!tutorCountries().includes(data.country)) {
      return NextResponse.json({ error: "Select a listed country" }, { status: 400 });
    }
    const cityOptions = [...citiesForCountry(data.country), ...splitCsv(existing?.location)];
    const location =
      pickKnown([data.location], cityOptions)[0] ||
      (data.location.toLowerCase() === "online" ? "Online" : data.location);

    const levelCatalog = tutorLevelOptions(curriculumLevels());
    const languageCatalog = tutorLanguageOptions();
    const skillCatalog = [
      ...expertiseForSubjects(subjects),
      ...GENERIC_EXPERTISE,
      ...splitCsv(existing?.expertise),
    ];
    const expertise = joinCsv(pickKnown(splitCsv(data.expertise), skillCatalog));
    const levels = joinCsv(
      pickKnown(splitCsv(data.levels), [...levelCatalog.core, ...levelCatalog.more, ...splitCsv(existing?.levels)]),
    );
    const languages = joinCsv(
      pickKnown(splitCsv(data.languages), [
        ...languageCatalog.core,
        ...languageCatalog.more,
        ...splitCsv(existing?.languages),
      ]),
    );
    const subjectCsv = joinCsv(subjects);
    const availability = serializeAvailability(parseAvailability(data.availability));
    const experienceYears =
      data.experienceYears == null || Number.isNaN(data.experienceYears) ? null : data.experienceYears;

    let normalizedPhone: string | null = null;
    const rawPhone = data.phone?.trim();
    if (rawPhone) {
      const countryCode = countryByName(data.country)?.code || "PK";
      normalizedPhone = normalizePhone(rawPhone, countryCode);
      if (!isValidPhone(normalizedPhone)) {
        return NextResponse.json({ error: "Enter a valid phone number for your country." }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsedName.name },
    });

    const profilePayload = {
      headline: data.headline,
      bio: data.bio,
      subjects: subjectCsv,
      hourlyRate: data.hourlyRate,
      location,
      country: data.country,
      expertise: expertise || null,
      online: data.online,
      inPerson: data.inPerson,
      photoUrl,
      photoCropX: data.photoCropX,
      photoCropY: data.photoCropY,
      photoCropZoom: data.photoCropZoom,
      qualifications: data.qualifications.trim(),
      experienceYears,
      teachingMethod: data.teachingMethod?.trim() || null,
      languages: languages || null,
      levels: levels || null,
      availability: availability || null,
      videoUrl: data.videoUrl?.trim() || null,
      introVideoUrl: data.introVideoUrl?.trim() || null,
      offersFreeTrial: Boolean(data.offersFreeTrial),
      phone: normalizedPhone,
    };
    const wasListable = existing
      ? isTutorProfileListable(existing, parsedName.name)
      : false;
    const listable = isTutorProfileListable(profilePayload, parsedName.name);

    const profile = await prisma.tutorProfile.upsert({
      where: { userId: session.user.id },
      update: profilePayload,
      create: {
        userId: session.user.id,
        ...profilePayload,
        // Free complete profiles list in search; paid plans add priority via syncTutorBadges.
        active: listable,
      },
    });

    const subjectCount = await prisma.subjectProfile.count({ where: { tutorProfileId: profile.id } });
    if (subjectCount === 0) {
      const { defaultSubjectProfileTitle, normalizeSubjectLabel, splitSubjectsCsv } = await import(
        "@/lib/subject-profile"
      );
      const subjects = splitSubjectsCsv(profile.subjects);
      const firstSubject = subjects[0] || "General tutoring";
      const subject = normalizeSubjectLabel(firstSubject);
      await prisma.subjectProfile.create({
        data: {
          tutorProfileId: profile.id,
          subject,
          title: profile.headline || defaultSubjectProfileTitle(subject),
          headline: profile.headline,
          description: profile.bio.slice(0, 500),
          level: profile.levels?.split(",")[0]?.trim() || "All levels",
          location: profile.location,
          country: profile.country,
          online: profile.online,
          inPerson: profile.inPerson,
          rate: profile.hourlyRate,
          status: "ACTIVE",
        },
      });
      await prisma.tutorAd
        .create({
          data: {
            tutorProfileId: profile.id,
            subject,
            title: profile.headline || defaultSubjectProfileTitle(subject),
            level: profile.levels?.split(",")[0]?.trim() || "All levels",
            location: profile.location,
            online: profile.online,
            inPerson: profile.inPerson,
            rate: profile.hourlyRate,
            description: profile.bio.slice(0, 500),
            status: "ACTIVE",
          },
        })
        .catch(() => undefined);
    }

    await syncTutorBadges(session.user.id);

    void tryAwardProfileCompleteBonus(session.user.id).catch((err) =>
      console.error("[hub-points] profile complete bonus failed", err),
    );

    if (!wasListable && listable) {
      void sendTutorProfileLiveEmail(session.user.id, profile.id).catch((err) =>
        console.error("[email-nurture] profile live failed", err),
      );
    }

    const refreshed = await prisma.tutorProfile.findUnique({ where: { id: profile.id } });
    return NextResponse.json(refreshed ?? profile);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Check the required fields" }, { status: 400 });
    }
    console.error("Tutor profile save failed:", e);
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }
}

const draftSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  headline: z.string().max(120).optional(),
  bio: z.string().max(4000).optional(),
  subjects: z.string().max(2000).optional(),
  hourlyRate: z.number().min(0).max(50000).optional(),
  location: z.string().max(120).optional(),
  country: z.string().max(80).optional(),
  expertise: z.string().max(1000).optional(),
  online: z.boolean().optional(),
  inPerson: z.boolean().optional(),
  photoUrl: z.string().max(2000).optional(),
  photoCropX: z.coerce.number().min(-100).max(100).optional(),
  photoCropY: z.coerce.number().min(-100).max(100).optional(),
  photoCropZoom: z.coerce.number().min(1).max(3).optional(),
  qualifications: z.string().max(2000).optional(),
  teachingMethod: z.string().max(2000).optional(),
  languages: z.string().max(500).optional(),
  levels: z.string().max(500).optional(),
  availability: z.string().max(4000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(40).optional().nullable(),
  videoUrl: z.string().max(500).optional().or(z.literal("")),
  introVideoUrl: z.string().max(500).optional().or(z.literal("")),
  offersFreeTrial: z.boolean().optional(),
  phone: z.string().max(40).optional(),
  wizardStep: z.string().max(40).optional(),
});

/**
 * Partial draft save for the multi-step profile wizard.
 * Does not publish: syncTutorBadges only sets active when the profile is listable.
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = draftSchema.parse(await req.json());
    let existing = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!existing) {
      existing = await prisma.tutorProfile.create({
        data: {
          userId: session.user.id,
          bio: "",
          subjects: "",
          hourlyRate: 1500,
          location: "",
          online: true,
          inPerson: false,
          active: false,
        },
      });
    }

    const patch: Record<string, unknown> = {};

    if (data.name !== undefined) {
      const parsedName = parseDisplayNameInput(data.name);
      if (!parsedName.ok) {
        return NextResponse.json({ error: parsedName.error }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: parsedName.name },
      });
    }

    if (data.photoUrl !== undefined) {
      const rawPhoto = data.photoUrl.trim();
      if (rawPhoto.startsWith("data:")) {
        return NextResponse.json(
          { error: "Upload photos via the file picker. Data URLs are not stored." },
          { status: 400 },
        );
      }
      if (rawPhoto && !/^https:\/\//i.test(rawPhoto)) {
        return NextResponse.json({ error: "Photo must be an https:// URL" }, { status: 400 });
      }
      if (rawPhoto && !isAllowedBlobUrl(rawPhoto)) {
        return NextResponse.json(
          { error: "Upload your photo via the file picker on this page." },
          { status: 400 },
        );
      }
      patch.photoUrl = rawPhoto || null;
    }
    if (data.photoCropX !== undefined) patch.photoCropX = data.photoCropX;
    if (data.photoCropY !== undefined) patch.photoCropY = data.photoCropY;
    if (data.photoCropZoom !== undefined) patch.photoCropZoom = data.photoCropZoom;

    if (data.headline !== undefined) patch.headline = data.headline.trim() || null;
    if (data.bio !== undefined) patch.bio = data.bio.trim();
    if (data.qualifications !== undefined) patch.qualifications = data.qualifications.trim() || null;
    if (data.teachingMethod !== undefined) patch.teachingMethod = data.teachingMethod.trim() || null;
    if (data.online !== undefined) patch.online = data.online;
    if (data.inPerson !== undefined) patch.inPerson = data.inPerson;
    if (data.offersFreeTrial !== undefined) patch.offersFreeTrial = data.offersFreeTrial;
    if (data.videoUrl !== undefined) patch.videoUrl = data.videoUrl.trim() || null;
    if (data.introVideoUrl !== undefined) patch.introVideoUrl = data.introVideoUrl.trim() || null;
    if (data.experienceYears !== undefined) {
      patch.experienceYears =
        data.experienceYears == null || Number.isNaN(data.experienceYears)
          ? null
          : data.experienceYears;
    }
    if (data.hourlyRate !== undefined && Number.isFinite(data.hourlyRate)) {
      patch.hourlyRate = Math.round(data.hourlyRate);
    }
    if (data.availability !== undefined) {
      patch.availability = serializeAvailability(parseAvailability(data.availability)) || null;
    }

    if (data.country !== undefined) {
      const country = data.country.trim();
      if (country && !tutorCountries().includes(country)) {
        return NextResponse.json({ error: "Select a listed country" }, { status: 400 });
      }
      if (country) patch.country = country;
    }

    if (data.location !== undefined) {
      const country = String(patch.country || existing.country || "");
      const cityOptions = [...citiesForCountry(country), ...splitCsv(existing.location)];
      const location = data.location.trim();
      patch.location =
        pickKnown([location], cityOptions)[0] ||
        (location.toLowerCase() === "online" ? "Online" : location);
    }

    if (data.subjects !== undefined) {
      const listed = await prisma.subject.findMany({ select: { name: true } });
      const subjectCatalog = mergeSubjectNames(
        listed.map((row) => row.name),
        catalogSubjectNames(),
        splitCsv(existing.subjects),
      );
      const subjectParts = splitCsv(data.subjects);
      const subjects = pickKnown(subjectParts, subjectCatalog);
      if (subjectParts.length && subjects.length !== subjectParts.length) {
        return NextResponse.json({ error: "Choose subjects from the listed catalog only" }, { status: 400 });
      }
      patch.subjects = joinCsv(subjects);
    }

    const subjectCsv = String(patch.subjects ?? existing.subjects ?? "");
    const subjectList = splitCsv(subjectCsv);
    if (data.expertise !== undefined) {
      const skillCatalog = [
        ...expertiseForSubjects(subjectList),
        ...GENERIC_EXPERTISE,
        ...splitCsv(existing.expertise),
      ];
      patch.expertise = joinCsv(pickKnown(splitCsv(data.expertise), skillCatalog)) || null;
    }
    if (data.levels !== undefined) {
      const levelCatalog = tutorLevelOptions(curriculumLevels());
      patch.levels =
        joinCsv(
          pickKnown(splitCsv(data.levels), [
            ...levelCatalog.core,
            ...levelCatalog.more,
            ...splitCsv(existing.levels),
          ]),
        ) || null;
    }
    if (data.languages !== undefined) {
      const languageCatalog = tutorLanguageOptions();
      patch.languages =
        joinCsv(
          pickKnown(splitCsv(data.languages), [
            ...languageCatalog.core,
            ...languageCatalog.more,
            ...splitCsv(existing.languages),
          ]),
        ) || null;
    }

    if (data.phone !== undefined) {
      const rawPhone = data.phone.trim();
      if (!rawPhone) {
        patch.phone = null;
      } else {
        const countryName = String(patch.country || existing.country || "");
        const countryCode = countryByName(countryName)?.code || "PK";
        const normalizedPhone = normalizePhone(rawPhone, countryCode);
        if (!isValidPhone(normalizedPhone)) {
          return NextResponse.json({ error: "Enter a valid phone number for your country." }, { status: 400 });
        }
        patch.phone = normalizedPhone;
      }
    }

    if (Object.keys(patch).length === 0 && data.name === undefined) {
      return NextResponse.json({ ok: true, draft: true, active: existing.active });
    }

    const profile = await prisma.tutorProfile.update({
      where: { id: existing.id },
      data: patch,
    });

    // Recalculate public visibility — incomplete drafts stay hidden.
    await syncTutorBadges(session.user.id);
    const refreshed = await prisma.tutorProfile.findUnique({ where: { id: profile.id } });

    return NextResponse.json({
      ok: true,
      draft: true,
      active: refreshed?.active ?? false,
      photoUrl: refreshed?.photoUrl ?? profile.photoUrl,
      wizardStep: data.wizardStep || null,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Could not save draft" }, { status: 400 });
    }
    console.error("Tutor profile draft save failed:", e);
    return NextResponse.json({ error: "Could not save progress" }, { status: 500 });
  }
}
