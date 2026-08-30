import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeAiOneShot } from "@/lib/ai-chat";
import { checkRateLimit, rateLimitResponse } from "@/lib/auth-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { splitCsv } from "@/lib/tutor-catalog";
import {
  AI_TUTOR_BIO_KIND,
  AI_TUTOR_BIO_RATE_LIMIT,
  buildTutorBioUserMessage,
  formatTeachingListingFacts,
  mergeTutorBioFacts,
  resolveTutorBioAiMode,
  sanitizeGeneratedBio,
  summarizeTeachingCapabilities,
  tutorCopyAiSystemPrompt,
} from "@/lib/tutor-bio-ai";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const stringList = z.union([
  z.string().max(2000),
  z.array(z.string().trim().max(80)).max(48),
]);

const schema = z.object({
  mode: z.enum(["generate", "improve"]).optional().default("generate"),
  purpose: z.enum(["bio", "teachingDescription"]).optional().default("bio"),
  name: z.string().trim().max(80).optional(),
  bio: z.string().max(4000).optional(),
  headline: z.string().trim().max(120).optional(),
  subjects: z.union([z.string().max(500), z.array(z.string().trim().max(80)).max(12)]).optional(),
  location: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  qualifications: z.string().trim().max(2000).optional(),
  experienceYears: z.number().int().min(0).max(40).nullable().optional(),
  teachingMethod: z.string().trim().max(2000).optional(),
  languages: z.string().trim().max(500).optional(),
  levels: stringList.optional(),
  expertise: z.string().trim().max(1000).optional(),
  listings: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(500).optional(),
  hourlyRateLabel: z.string().trim().max(80).optional(),
  online: z.boolean().optional(),
  inPerson: z.boolean().optional(),
  boards: stringList.optional(),
  qualificationStages: stringList.optional(),
  syllabusCodes: stringList.optional(),
});

function asStringList(value?: string | string[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return value
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as Role;
  if (role !== "TUTOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Tutor sign-in required" }, { status: 403 });
  }

  const burst = checkRateLimit(`tutor-bio:${session.user.id}`, 8, 10 * 60 * 1000);
  if (!burst.ok) return rateLimitResponse(burst.retryAfterSec);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      role: true,
      suspended: true,
      tutorProfile: {
        select: {
          bio: true,
          headline: true,
          subjects: true,
          location: true,
          country: true,
          qualifications: true,
          experienceYears: true,
          teachingMethod: true,
          languages: true,
          levels: true,
          expertise: true,
          subjectProfiles: {
            where: { status: "ACTIVE" },
            select: {
              subject: true,
              title: true,
              level: true,
              board: true,
              qualification: true,
              syllabusCode: true,
            },
            take: 12,
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });

  if (!user || user.suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }
  if (!user.tutorProfile) {
    return NextResponse.json({ error: "Create your tutor profile first" }, { status: 404 });
  }

  const settings = await getSiteSettings();
  if (settings.disableAiAssistant && role !== "ADMIN") {
    return NextResponse.json(
      { error: "The writing helper is temporarily unavailable. You can still write the introduction yourself." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const draft = parsed.data;
  const stored = user.tutorProfile;
  const purpose = draft.purpose;
  const listings = draft.listings?.trim() || formatTeachingListingFacts(stored.subjectProfiles);
  const thisSubject = asStringList(draft.subjects);
  const facts = mergeTutorBioFacts(
    {
      name: draft.name,
      headline: draft.headline,
      subjects: draft.subjects,
      location: draft.location,
      country: draft.country,
      qualifications: purpose === "teachingDescription" ? undefined : draft.qualifications,
      experienceYears: draft.experienceYears,
      teachingMethod: draft.teachingMethod,
      languages: draft.languages,
      levels: draft.levels,
      expertise: draft.expertise,
      listings: draft.listings,
      notes: draft.notes,
      hourlyRateLabel: draft.hourlyRateLabel,
      online: draft.online,
      inPerson: draft.inPerson,
      boards: draft.boards,
      qualificationStages: draft.qualificationStages,
      syllabusCodes: draft.syllabusCodes,
    },
    {
      name: user.name,
      headline: stored.headline,
      subjects: purpose === "teachingDescription" ? thisSubject : splitCsv(stored.subjects),
      location: stored.location,
      country: stored.country,
      qualifications: purpose === "teachingDescription" ? "" : stored.qualifications,
      experienceYears: stored.experienceYears,
      teachingMethod: stored.teachingMethod,
      languages: stored.languages,
      levels: purpose === "teachingDescription" ? draft.levels : stored.levels,
      expertise: stored.expertise,
      listings,
    },
  );
  if (purpose === "teachingDescription") {
    if (thisSubject.length) facts.subjects = thisSubject;
    facts.capabilitySummary = summarizeTeachingCapabilities({
      subject: thisSubject[0] || asStringList(facts.subjects)[0] || "",
      hourlyRateLabel: draft.hourlyRateLabel,
      online: draft.online,
      inPerson: draft.inPerson,
      levels: asStringList(draft.levels),
      boards: asStringList(draft.boards),
      qualificationStages: asStringList(draft.qualificationStages),
      syllabusCodes: asStringList(draft.syllabusCodes),
    });
  }

  const existingBio = draft.bio ?? (purpose === "teachingDescription" ? "" : stored.bio);
  const mode = resolveTutorBioAiMode(draft.mode, existingBio);
  const userContent = buildTutorBioUserMessage({
    mode,
    facts,
    existingBio,
    purpose,
  });

  const result = await completeAiOneShot({
    userId: session.user.id,
    kind: AI_TUTOR_BIO_KIND,
    userContent,
    systemPrompt: tutorCopyAiSystemPrompt(purpose),
    rateLimit: AI_TUTOR_BIO_RATE_LIMIT,
  });

  if (!result.ok) {
    const error =
      result.status === 503
        ? purpose === "teachingDescription"
          ? "The writing helper isn't configured right now. You can still write the teaching description yourself."
          : "The writing helper isn't configured right now. You can still write the introduction yourself."
        : result.error;
    return NextResponse.json(
      { error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    );
  }

  const bio = sanitizeGeneratedBio(result.text);
  const minChars = purpose === "teachingDescription" ? 20 : 40;
  if (bio.length < minChars) {
    return NextResponse.json(
      {
        error:
          purpose === "teachingDescription"
            ? "Could not draft a usable teaching description. Add the subject or a short note and try again."
            : "Could not draft a usable introduction. Add a subject or a short note and try again.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    bio,
    mode,
    remaining: result.remaining,
  });
}
