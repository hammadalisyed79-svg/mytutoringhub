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
  AI_TUTOR_BIO_SYSTEM,
  buildTutorBioUserMessage,
  formatTeachingListingFacts,
  mergeTutorBioFacts,
  resolveTutorBioAiMode,
  sanitizeGeneratedBio,
} from "@/lib/tutor-bio-ai";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  mode: z.enum(["generate", "improve"]).optional().default("generate"),
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
  levels: z.string().trim().max(500).optional(),
  expertise: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(500).optional(),
});

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
  const listings = formatTeachingListingFacts(stored.subjectProfiles);
  const facts = mergeTutorBioFacts(
    {
      name: draft.name,
      headline: draft.headline,
      subjects: draft.subjects,
      location: draft.location,
      country: draft.country,
      qualifications: draft.qualifications,
      experienceYears: draft.experienceYears,
      teachingMethod: draft.teachingMethod,
      languages: draft.languages,
      levels: draft.levels,
      expertise: draft.expertise,
      notes: draft.notes,
    },
    {
      name: user.name,
      headline: stored.headline,
      subjects: splitCsv(stored.subjects),
      location: stored.location,
      country: stored.country,
      qualifications: stored.qualifications,
      experienceYears: stored.experienceYears,
      teachingMethod: stored.teachingMethod,
      languages: stored.languages,
      levels: stored.levels,
      expertise: stored.expertise,
      listings,
    },
  );

  const existingBio = draft.bio ?? stored.bio;
  const mode = resolveTutorBioAiMode(draft.mode, existingBio);
  const userContent = buildTutorBioUserMessage({
    mode,
    facts,
    existingBio,
  });

  const result = await completeAiOneShot({
    userId: session.user.id,
    kind: AI_TUTOR_BIO_KIND,
    userContent,
    systemPrompt: AI_TUTOR_BIO_SYSTEM,
    rateLimit: AI_TUTOR_BIO_RATE_LIMIT,
  });

  if (!result.ok) {
    const error =
      result.status === 503
        ? "The writing helper isn't configured right now. You can still write the introduction yourself."
        : result.error;
    return NextResponse.json(
      { error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    );
  }

  const bio = sanitizeGeneratedBio(result.text);
  if (bio.length < 40) {
    return NextResponse.json(
      { error: "Could not draft a usable introduction. Add a subject or a short note and try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    bio,
    mode,
    remaining: result.remaining,
  });
}
