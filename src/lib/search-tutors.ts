import { prisma } from "@/lib/prisma";
import { isBoostActive } from "@/lib/subscription";

export type TutorSearchFilters = {
  q?: string;
  subject?: string;
  location?: string;
  mode?: string;
  verified?: string;
  max?: string;
  level?: string;
  trial?: string;
  language?: string;
  page?: string;
};

export const PAGE_SIZE = 12;

export async function searchTutors(filters: TutorSearchFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const now = new Date();

  const profiles = await prisma.tutorProfile.findMany({
    where: {
      active: true,
      user: { suspended: false },
      ...(filters.verified === "1" ? { verified: true } : {}),
      ...(filters.trial === "1" ? { offersFreeTrial: true } : {}),
      ...(filters.max ? { hourlyRate: { lte: Number(filters.max) } } : {}),
      ...(filters.language
        ? { languages: { contains: filters.language, mode: "insensitive" } }
        : {}),
      ...(filters.level ? { levels: { contains: filters.level, mode: "insensitive" } } : {}),
      ...(filters.mode === "online" ? { online: true } : {}),
      ...(filters.mode === "inperson" ? { inPerson: true } : {}),
      ...(filters.location
        ? { location: { contains: filters.location, mode: "insensitive" } }
        : {}),
      ...(filters.subject
        ? {
            OR: [
              { subjects: { contains: filters.subject, mode: "insensitive" } },
              {
                ads: {
                  some: {
                    status: "ACTIVE",
                    subject: { contains: filters.subject, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : filters.q
          ? {
              OR: [
                { subjects: { contains: filters.q, mode: "insensitive" } },
                { bio: { contains: filters.q, mode: "insensitive" } },
                { location: { contains: filters.q, mode: "insensitive" } },
                { headline: { contains: filters.q, mode: "insensitive" } },
                { user: { name: { contains: filters.q, mode: "insensitive" } } },
                {
                  ads: {
                    some: {
                      status: "ACTIVE",
                      OR: [
                        { subject: { contains: filters.q, mode: "insensitive" } },
                        { title: { contains: filters.q, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
      ads: { where: { status: "ACTIVE" }, take: 6 },
    },
  });

  const scored = profiles
    .map((t) => {
      const boost = isBoostActive(t.boostUntil, now) ? 2 : 0;
      const highlight =
        (t.highlightedUntil && t.highlightedUntil > now) || t.highlighted ? 1 : 0;
      const verified = t.verified ? 1 : 0;
      return { t, score: boost * 1000 + highlight * 100 + verified * 10 - t.hourlyRate / 10000 };
    })
    .sort((a, b) => b.score - a.score);

  const total = scored.length;
  const slice = scored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => s.t);
  return {
    tutors: slice,
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function averageRateForSubject(subject: string) {
  const ads = await prisma.tutorAd.findMany({
    where: { status: "ACTIVE", subject: { contains: subject, mode: "insensitive" } },
    select: { rate: true },
  });
  if (ads.length === 0) {
    const profiles = await prisma.tutorProfile.findMany({
      where: { active: true, subjects: { contains: subject, mode: "insensitive" } },
      select: { hourlyRate: true },
    });
    if (profiles.length === 0) return null;
    return profiles.reduce((s, p) => s + p.hourlyRate, 0) / profiles.length;
  }
  return ads.reduce((s, a) => s + a.rate, 0) / ads.length;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function similarTutors(opts: {
  id: string;
  subjects: string;
  location: string;
  take?: number;
}) {
  const first = opts.subjects
    .split(/[,;/|]/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  const city = opts.location.split(/[/|,]/)[0]?.trim();
  const or = [
    ...(first ? [{ subjects: { contains: first, mode: "insensitive" as const } }] : []),
    ...(city ? [{ location: { contains: city, mode: "insensitive" as const } }] : []),
  ];
  if (or.length === 0) return [];

  return prisma.tutorProfile.findMany({
    where: {
      active: true,
      id: { not: opts.id },
      user: { suspended: false },
      OR: or,
    },
    include: { user: { select: { name: true } } },
    take: opts.take ?? 4,
    orderBy: [{ verified: "desc" }, { hourlyRate: "asc" }],
  });
}
