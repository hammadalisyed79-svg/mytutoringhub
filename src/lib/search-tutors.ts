import { prisma } from "@/lib/prisma";
import { currencyToPkr, type CurrencyCode } from "@/lib/currency";
import { matchCurriculumCode } from "@/lib/curriculum";
import {
  expandSubjectTerms,
  parseSearchQuery,
  resolveCity,
  resolveCountry,
  resolveSubjectName,
} from "@/lib/search-smart";
import { isBoostActive } from "@/lib/subscription";
import { getTrustBadgesForProfiles, trustBadgeSearchScore } from "@/lib/tutor-badges";
import { citiesForSearchCountry } from "@/lib/tutor-catalog";
import { publicListedTutorWhere, filterCanonicallyPublicTutors } from "@/lib/tutor-public-eligibility";

export type TutorSearchFilters = {
  q?: string;
  subject?: string;
  location?: string;
  country?: string;
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
    filters.q && !filters.subject && !filters.location && !filters.country
      ? parseSearchQuery(filters.q)
      : {};
  const codeMatch = matchCurriculumCode((filters.subject || filters.q || "").trim());
  const subjectResolved = resolveSubjectName(
    filters.subject || parsed.subject || codeMatch?.subject,
    opts?.subjectNames,
  );
  const countryResolved = resolveCountry(filters.country || parsed.country);
  const country = countryResolved.value;
  const cityPool = country ? citiesForSearchCountry(country) : undefined;
  const cityResolved = resolveCity(filters.location || parsed.location, cityPool);
  const subject = subjectResolved.value;
  const location = cityResolved.value;
  const level = (filters.level || parsed.level || (!filters.subject && codeMatch?.level) || "").trim();
  const mode = filters.mode || parsed.mode || "";
  let keyword = (filters.q || "").trim();
  if (filters.q && !filters.subject && !filters.location && !filters.country) {
    keyword = parsed.q || "";
  }
  if (codeMatch && keyword.toUpperCase() === codeMatch.code.toUpperCase()) keyword = "";

  const maxPkr =
    filters.max && opts?.currency
      ? currencyToPkr(Number(filters.max), opts.currency)
      : filters.max
        ? Number(filters.max)
        : undefined;

  const countryClause = (useCountry: boolean, withCity: boolean) => {
    if (!useCountry || !country) return {};
    if (withCity && location && location !== "Online") {
      return {
        OR: [{ country: contains(country) }, { country: null }, { country: { equals: "" } }],
      };
    }
    return {
      OR: [
        { country: contains(country) },
        ...citiesForSearchCountry(country)
          .filter((city) => city !== "Online")
          .map((city) => ({ location: contains(city) })),
      ],
    };
  };

  const query = (useLocation: boolean, useCountry: boolean) =>
    prisma.tutorProfile.findMany({
      where: {
        ...publicListedTutorWhere(),
        ...(filters.verified === "1" ? { verified: true } : {}),
        ...(filters.trial === "1" ? { offersFreeTrial: true } : {}),
        ...(maxPkr && Number.isFinite(maxPkr) ? { hourlyRate: { lte: maxPkr } } : {}),
        ...(filters.language ? { languages: contains(filters.language) } : {}),
        ...(level ? { levels: contains(level) } : {}),
        ...(mode === "online" || location === "Online" ? { online: true } : {}),
        ...(mode === "inperson" ? { inPerson: true } : {}),
        ...countryClause(useCountry, Boolean(useLocation)),
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
                          { expertise: contains(term) },
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
                          { expertise: contains(keyword) },
                          { country: contains(keyword) },
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
      select: {
        id: true,
        headline: true,
        bio: true,
        subjects: true,
        hourlyRate: true,
        location: true,
        online: true,
        inPerson: true,
        photoUrl: true,
        photoCropX: true,
        photoCropY: true,
        photoCropZoom: true,
        languages: true,
        levels: true,
        country: true,
        expertise: true,
        verified: true,
        planTier: true,
        highlighted: true,
        highlightedUntil: true,
        boostUntil: true,
        offersFreeTrial: true,
        active: true,
        forceActive: true,
        qualifications: true,
        user: { select: { id: true, name: true, emailVerified: true, suspended: true } },
        reviews: {
          where: { status: "PUBLISHED" },
          select: { rating: true, comment: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

  let profiles = filterCanonicallyPublicTutors(await query(true, Boolean(country)));
  let locationRelaxed = false;
  let keptCountry = Boolean(country);
  if (profiles.length === 0 && location && location !== "Online" && (subject || keyword)) {
    if (country) {
      profiles = filterCanonicallyPublicTutors(await query(false, true));
      if (profiles.length > 0) {
        locationRelaxed = true;
      } else {
        profiles = filterCanonicallyPublicTutors(await query(false, false));
        locationRelaxed = profiles.length > 0;
        keptCountry = false;
      }
    } else {
      profiles = filterCanonicallyPublicTutors(await query(false, false));
      locationRelaxed = profiles.length > 0;
    }
  }

  const badgeMap = await getTrustBadgesForProfiles(profiles.map((t) => t.id));

  const scored = profiles
    .map((t) => {
      const boost = isBoostActive(t.boostUntil, now) ? 2 : 0;
      const highlight =
        (t.highlightedUntil && t.highlightedUntil > now) || t.highlighted ? 1 : 0;
      const verified = t.verified ? 1 : 0;
      const trustScore = trustBadgeSearchScore(badgeMap.get(t.id) ?? "NEW");
      const tierScore = (t.planTier ?? 0) * 5;
      const locBoost =
        location && (t.location || "").toLowerCase().includes(location.toLowerCase()) ? 8 : 0;
      const countryBoost =
        country && (t.country || "").toLowerCase().includes(country.toLowerCase()) ? 3 : 0;
      // Structured match bonuses: prioritise tutors whose selections directly match
      const subjectFieldMatch = subject
        ? expandSubjectTerms(subject).some(
            (term) =>
              (t.subjects || "").toLowerCase().includes(term.toLowerCase()) ||
              (t.expertise || "").toLowerCase().includes(term.toLowerCase()),
          )
          ? 50
          : 0
        : 0;
      const levelFieldMatch =
        level && (t.levels || "").toLowerCase().includes(level.toLowerCase()) ? 30 : 0;
      return {
        t,
        score:
          tierScore * 100 +
          boost * 1000 +
          highlight * 100 +
          verified * 10 +
          trustScore * 15 +
          locBoost +
          countryBoost +
          subjectFieldMatch +
          levelFieldMatch -
          t.hourlyRate / 10000,
      };
    })
    .sort((a, b) => b.score - a.score);

  const total = scored.length;
  const slice = scored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
    ...s.t,
    trustBadge: badgeMap.get(s.t.id) ?? "NEW",
  }));
  return {
    tutors: slice,
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    resolved: { subject, location, country, level, keyword, mode },
    locationRelaxed,
    keptCountry,
  };
}

const AVERAGE_RATE_SELECT = {
  hourlyRate: true,
  active: true,
  forceActive: true,
  photoUrl: true,
  headline: true,
  bio: true,
  country: true,
  location: true,
  subjects: true,
  online: true,
  inPerson: true,
  qualifications: true,
  user: { select: { name: true, emailVerified: true, suspended: true } },
} as const;

export async function averageRateForSubject(subject: string) {
  const profiles = filterCanonicallyPublicTutors(
    await prisma.tutorProfile.findMany({
      where: {
        ...publicListedTutorWhere(),
        subjects: { contains: subject, mode: "insensitive" },
      },
      select: AVERAGE_RATE_SELECT,
    }),
  );
  if (profiles.length === 0) return null;
  return profiles.reduce((s, p) => s + p.hourlyRate, 0) / profiles.length;
}

/**
 * One DB round-trip for all subject averages — avoids N parallel queries on /subjects.
 */
export async function averageRatesBySubject(subjectNames: string[]) {
  const names = [...new Set(subjectNames.map((name) => name.trim()).filter(Boolean))];
  const empty = new Map<string, number | null>();
  for (const name of names) empty.set(name, null);
  if (names.length === 0) return empty;

  const profiles = filterCanonicallyPublicTutors(
    await prisma.tutorProfile.findMany({
      where: publicListedTutorWhere(),
      select: AVERAGE_RATE_SELECT,
    }),
  );

  const totals = new Map<string, { sum: number; count: number }>();
  for (const name of names) totals.set(name, { sum: 0, count: 0 });

  for (const profile of profiles) {
    const haystack = (profile.subjects || "").toLowerCase();
    if (!haystack) continue;
    for (const name of names) {
      if (!haystack.includes(name.toLowerCase())) continue;
      const row = totals.get(name)!;
      row.sum += profile.hourlyRate;
      row.count += 1;
    }
  }

  const out = new Map<string, number | null>();
  for (const name of names) {
    const row = totals.get(name)!;
    out.set(name, row.count > 0 ? row.sum / row.count : null);
  }
  return out;
}

/** Where clause for similar-tutor recommendations (public catalogue only). */
export function similarTutorsWhereClause(opts: {
  id: string;
  subjects: string;
  location: string;
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
  if (or.length === 0) return null;

  return {
    ...publicListedTutorWhere(),
    id: { not: opts.id },
    OR: or,
  };
}

export async function similarTutors(opts: {
  id: string;
  subjects: string;
  location: string;
  take?: number;
}) {
  const where = similarTutorsWhereClause(opts);
  if (!where) return [];

  return filterCanonicallyPublicTutors(
    await prisma.tutorProfile.findMany({
      where,
      select: {
        id: true,
        active: true,
        forceActive: true,
        photoUrl: true,
        photoCropX: true,
        photoCropY: true,
        photoCropZoom: true,
        headline: true,
        bio: true,
        country: true,
        location: true,
        subjects: true,
        hourlyRate: true,
        online: true,
        inPerson: true,
        qualifications: true,
        verified: true,
        planTier: true,
        user: { select: { name: true, emailVerified: true, suspended: true } },
        reviews: {
          where: { status: "PUBLISHED" },
          select: { rating: true, comment: true },
          orderBy: { createdAt: "desc" },
        },
      },
      take: opts.take ?? 4,
      orderBy: [{ verified: "desc" }, { hourlyRate: "asc" }],
    }),
  );
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}