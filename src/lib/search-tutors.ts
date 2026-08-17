import { prisma } from "@/lib/prisma";
import { currencyToPkr, type CurrencyCode } from "@/lib/currency";
import { matchCurriculumCode } from "@/lib/curriculum";
import {
  expandSubjectTerms,
  parseSearchQuery,
  resolveCity,
  resolveSubjectName,
} from "@/lib/search-smart";
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

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export async function searchTutors(
  filters: TutorSearchFilters,
  opts?: { currency?: CurrencyCode; subjectNames?: string[] },
) {
  const page = Math.max(1, Number(filters.page) || 1);
  const now = new Date();
  const parsed =
    filters.q && !filters.subject && !filters.location ? parseSearchQuery(filters.q) : {};
  const codeMatch = matchCurriculumCode((filters.subject || filters.q || "").trim());
  const subjectResolved = resolveSubjectName(
    filters.subject || parsed.subject || codeMatch?.subject,
    opts?.subjectNames,
  );
  const cityResolved = resolveCity(filters.location || parsed.location);
  const subject = subjectResolved.value;
  const location = cityResolved.value;
  const level = (filters.level || parsed.level || (!filters.subject && codeMatch?.level) || "").trim();
  const mode = filters.mode || parsed.mode || "";
  let keyword = (filters.q || "").trim();
  if (filters.q && !filters.subject && !filters.location) keyword = parsed.q || "";
  if (codeMatch && keyword.toUpperCase() === codeMatch.code.toUpperCase()) keyword = "";

  const maxPkr =
    filters.max && opts?.currency
      ? currencyToPkr(Number(filters.max), opts.currency)
      : filters.max
        ? Number(filters.max)
        : undefined;

  const query = (useLocation: boolean) =>
    prisma.tutorProfile.findMany({
      where: {
        active: true,
        user: { suspended: false },
        ...(filters.verified === "1" ? { verified: true } : {}),
        ...(filters.trial === "1" ? { offersFreeTrial: true } : {}),
        ...(maxPkr && Number.isFinite(maxPkr) ? { hourlyRate: { lte: maxPkr } } : {}),
        ...(filters.language ? { languages: contains(filters.language) } : {}),
        ...(level ? { levels: contains(level) } : {}),
        ...(mode === "online" || location === "Online" ? { online: true } : {}),
        ...(mode === "inperson" ? { inPerson: true } : {}),
        ...(useLocation && location && location !== "Online"
          ? { location: contains(location) }
          : {}),
        ...((subject || keyword)
          ? {
              AND: [
                ...(subject
                  ? [
                      {
                        OR: expandSubjectTerms(subject).flatMap((term) => [
                          { subjects: contains(term) },
                          {
                            ads: {
                              some: { status: "ACTIVE" as const, subject: contains(term) },
                            },
                          },
                        ]),
                      },
                    ]
                  : []),
                ...(keyword
                  ? [
                      {
                        OR: [
                          { subjects: contains(keyword) },
                          { bio: contains(keyword) },
                          { location: contains(keyword) },
                          { headline: contains(keyword) },
                          { user: { name: contains(keyword) } },
                          {
                            ads: {
                              some: {
                                status: "ACTIVE" as const,
                                OR: [{ subject: contains(keyword) }, { title: contains(keyword) }],
                              },
                            },
                          },
                        ],
                      },
                    ]
                  : []),
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

  let profiles = await query(true);
  let locationRelaxed = false;
  if (profiles.length === 0 && location && location !== "Online" && (subject || keyword)) {
    profiles = await query(false);
    locationRelaxed = profiles.length > 0;
  }

  const scored = profiles
    .map((t) => {
      const boost = isBoostActive(t.boostUntil, now) ? 2 : 0;
      const highlight =
        (t.highlightedUntil && t.highlightedUntil > now) || t.highlighted ? 1 : 0;
      const verified = t.verified ? 1 : 0;
      const locBoost =
        location && t.location.toLowerCase().includes(location.toLowerCase()) ? 8 : 0;
      return {
        t,
        score: boost * 1000 + highlight * 100 + verified * 10 + locBoost - t.hourlyRate / 10000,
      };
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
    resolved: { subject, location, level, keyword, mode },
    locationRelaxed,
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