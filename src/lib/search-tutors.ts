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
import { isBoostActive, isHighlightActive } from "@/lib/subscription";
import { getTrustBadgesForProfiles, trustBadgeSearchScore } from "@/lib/tutor-badges";
import { citiesForSearchCountry } from "@/lib/tutor-catalog";
import {
  publicListedTutorWhere,
  tutorPublicVisibilityInput,
  canViewTutorProfilePublicly,
} from "@/lib/tutor-public-eligibility";
import { listingPath } from "@/lib/subject-profile";
import { dedupeSearchByTutor, type AlsoTeachesItem } from "@/lib/search-dedupe";

export type TutorSearchFilters = {
  q?: string;
  subject?: string;
  location?: string;
  country?: string;
  mode?: string;
  verified?: string;
  max?: string;
  level?: string;
  board?: string;
  trial?: string;
  language?: string;
  page?: string;
  sort?: string;
  syllabusCode?: string;
};

/** Flattened search card: best matching Teaching Listing + parent tutor identity. */
export type SearchListingCard = {
  id: string;
  listingId: string;
  tutorProfileId: string;
  subject: string;
  title: string;
  headline: string | null;
  bio: string;
  subjects: string;
  hourlyRate: number;
  location: string;
  online: boolean;
  inPerson: boolean;
  photoUrl: string | null;
  photoCropX: number | null;
  photoCropY: number | null;
  photoCropZoom: number | null;
  languages: string | null;
  levels: string | null;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
  country: string | null;
  expertise: string | null;
  verified: boolean;
  planTier: number;
  highlighted: boolean;
  highlightedUntil: Date | null;
  boostUntil: Date | null;
  offersFreeTrial: boolean;
  active: boolean;
  forceActive: boolean;
  qualifications: string | null;
  user: { id: string; name: string; emailVerified: Date | null; suspended: boolean };
  reviews: { rating: number; comment: string | null }[];
  trustBadge?: string;
  alsoTeaches: AlsoTeachesItem[];
};

export const PAGE_SIZE = 12;

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

const LISTING_PARENT_SELECT = {
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
    where: { status: "PUBLISHED" as const },
    select: { rating: true, comment: true },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

type ListingRow = {
  id: string;
  subject: string;
  title: string;
  headline: string | null;
  description: string | null;
  level: string;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
  location: string;
  country: string | null;
  online: boolean;
  inPerson: boolean;
  rate: number;
  status: string;
  highlightedUntil: Date | null;
  boostUntil: Date | null;
  tutorProfile: {
    id: string;
    headline: string | null;
    bio: string;
    subjects: string;
    hourlyRate: number;
    location: string;
    online: boolean;
    inPerson: boolean;
    photoUrl: string | null;
    photoCropX: number | null;
    photoCropY: number | null;
    photoCropZoom: number | null;
    languages: string | null;
    levels: string | null;
    country: string | null;
    expertise: string | null;
    verified: boolean;
    planTier: number;
    highlighted: boolean;
    highlightedUntil: Date | null;
    boostUntil: Date | null;
    offersFreeTrial: boolean;
    active: boolean;
    forceActive: boolean;
    qualifications: string | null;
    user: { id: string; name: string; emailVerified: Date | null; suspended: boolean };
    reviews: { rating: number; comment: string | null }[];
  };
};

function isPublicListing(row: ListingRow): boolean {
  if (row.status !== "ACTIVE") return false;
  return canViewTutorProfilePublicly(tutorPublicVisibilityInput(row.tutorProfile));
}

function toSearchCard(row: ListingRow, now = new Date()): SearchListingCard {
  const p = row.tutorProfile;
  const boostUntil = row.boostUntil || p.boostUntil;
  const highlightedUntil = row.highlightedUntil || p.highlightedUntil;
  return {
    id: row.id,
    listingId: row.id,
    tutorProfileId: p.id,
    subject: row.subject,
    title: row.title,
    headline: row.headline || row.title || p.headline,
    bio: row.description || p.bio,
    subjects: row.subject,
    hourlyRate: row.rate,
    location: row.location || p.location,
    online: row.online,
    inPerson: row.inPerson,
    photoUrl: p.photoUrl,
    photoCropX: p.photoCropX,
    photoCropY: p.photoCropY,
    photoCropZoom: p.photoCropZoom,
    languages: p.languages,
    levels: row.level || p.levels,
    board: row.board,
    qualification: row.qualification,
    syllabusCode: row.syllabusCode,
    country: row.country || p.country,
    expertise: p.expertise,
    verified: p.verified,
    planTier: p.planTier,
    highlighted: isHighlightActive(highlightedUntil, p.highlighted, now),
    highlightedUntil,
    boostUntil,
    offersFreeTrial: p.offersFreeTrial,
    active: p.active,
    forceActive: p.forceActive,
    qualifications: p.qualifications,
    user: p.user,
    reviews: p.reviews,
    alsoTeaches: [],
  };
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
  const board = (filters.board || codeMatch?.board || "").trim();
  const syllabusCode = (filters.syllabusCode || codeMatch?.code || "").trim();
  const sort = (filters.sort || "relevance").trim().toLowerCase();
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

  const parentCountryClause = (useCountry: boolean, withCity: boolean) => {
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

  const query = async (useLocation: boolean, useCountry: boolean) => {
    const rows = await prisma.subjectProfile.findMany({
      where: {
        status: "ACTIVE",
        ...(maxPkr && Number.isFinite(maxPkr) ? { rate: { lte: maxPkr } } : {}),
        ...(mode === "online" || location === "Online" ? { online: true } : {}),
        ...(mode === "inperson" ? { inPerson: true } : {}),
        ...(useLocation && location && location !== "Online"
          ? { location: contains(location) }
          : {}),
        ...(board ? { board: contains(board) } : {}),
        ...(syllabusCode ? { syllabusCode: contains(syllabusCode) } : {}),
        ...(level
          ? {
              OR: [
                { level: contains(level) },
                { qualification: contains(level) },
                { tutorProfile: { levels: contains(level) } },
              ],
            }
          : {}),
        ...(subject
          ? {
              OR: expandSubjectTerms(subject).flatMap((term) => [
                { subject: contains(term) },
                { title: contains(term) },
                { tutorProfile: { expertise: contains(term) } },
              ]),
            }
          : {}),
        ...(keyword
          ? {
              OR: [
                { subject: contains(keyword) },
                { title: contains(keyword) },
                { description: contains(keyword) },
                { location: contains(keyword) },
                { headline: contains(keyword) },
                { board: contains(keyword) },
                { qualification: contains(keyword) },
                { syllabusCode: contains(keyword) },
                {
                  tutorProfile: {
                    OR: [
                      { subjects: contains(keyword) },
                      { expertise: contains(keyword) },
                      { bio: contains(keyword) },
                      { headline: contains(keyword) },
                      { user: { name: contains(keyword) } },
                    ],
                  },
                },
              ],
            }
          : {}),
        tutorProfile: {
          ...publicListedTutorWhere(),
          ...(filters.verified === "1" ? { verified: true } : {}),
          ...(filters.trial === "1" ? { offersFreeTrial: true } : {}),
          ...(filters.language ? { languages: contains(filters.language) } : {}),
          ...parentCountryClause(useCountry, Boolean(useLocation)),
        },
      },
      select: {
        id: true,
        subject: true,
        title: true,
        headline: true,
        description: true,
        level: true,
        board: true,
        qualification: true,
        syllabusCode: true,
        location: true,
        country: true,
        online: true,
        inPerson: true,
        rate: true,
        status: true,
        highlightedUntil: true,
        boostUntil: true,
        tutorProfile: { select: LISTING_PARENT_SELECT },
      },
    });
    return (rows as ListingRow[]).filter(isPublicListing);
  };

  let listings = await query(true, Boolean(country));
  let locationRelaxed = false;
  let keptCountry = Boolean(country);
  if (listings.length === 0 && location && location !== "Online" && (subject || keyword)) {
    if (country) {
      listings = await query(false, true);
      if (listings.length > 0) {
        locationRelaxed = true;
      } else {
        listings = await query(false, false);
        locationRelaxed = listings.length > 0;
        keptCountry = false;
      }
    } else {
      listings = await query(false, false);
      locationRelaxed = listings.length > 0;
    }
  }

  const badgeMap = await getTrustBadgesForProfiles(listings.map((row) => row.tutorProfile.id));

  const scored = listings
    .map((row) => {
      const card = toSearchCard(row, now);
      const boost = isBoostActive(card.boostUntil, now) ? 2 : 0;
      const highlight = card.highlighted ? 1 : 0;
      const verified = card.verified ? 1 : 0;
      const trustScore = trustBadgeSearchScore(badgeMap.get(card.tutorProfileId) ?? "NEW");
      const tierScore = (card.planTier ?? 0) * 5;
      const locBoost =
        location && (card.location || "").toLowerCase().includes(location.toLowerCase()) ? 8 : 0;
      const countryBoost =
        country && (card.country || "").toLowerCase().includes(country.toLowerCase()) ? 3 : 0;
      const subjectFieldMatch = subject
        ? expandSubjectTerms(subject).some(
            (term) =>
              card.subject.toLowerCase().includes(term.toLowerCase()) ||
              (card.expertise || "").toLowerCase().includes(term.toLowerCase()),
          )
          ? 50
          : 0
        : 0;
      const levelFieldMatch =
        level &&
        ((card.levels || "").toLowerCase().includes(level.toLowerCase()) ||
          (card.qualification || "").toLowerCase().includes(level.toLowerCase()))
          ? 30
          : 0;
      const boardMatch =
        board && (card.board || "").toLowerCase().includes(board.toLowerCase()) ? 40 : 0;
      const codeMatchScore =
        syllabusCode &&
        (card.syllabusCode || "").toUpperCase() === syllabusCode.toUpperCase()
          ? 80
          : 0;
      return {
        card: {
          ...card,
          trustBadge: badgeMap.get(card.tutorProfileId) ?? "NEW",
        },
        listingId: card.listingId,
        tutorProfileId: card.tutorProfileId,
        subject: card.subject,
        title: card.title,
        level: card.levels || "",
        score:
          tierScore * 100 +
          boost * 1000 +
          highlight * 100 +
          verified * 10 +
          trustScore * 15 +
          locBoost +
          countryBoost +
          subjectFieldMatch +
          levelFieldMatch +
          boardMatch +
          codeMatchScore -
          card.hourlyRate / 10000,
      };
    })
    .sort((a, b) => b.score - a.score);

  const deduped = dedupeSearchByTutor(scored);

  function avgRating(card: SearchListingCard) {
    if (!card.reviews.length) return -1;
    return card.reviews.reduce((s, r) => s + r.rating, 0) / card.reviews.length;
  }

  const ordered =
    sort === "price_asc"
      ? [...deduped].sort((a, b) => a.card.hourlyRate - b.card.hourlyRate || b.score - a.score)
      : sort === "price_desc"
        ? [...deduped].sort((a, b) => b.card.hourlyRate - a.card.hourlyRate || b.score - a.score)
        : sort === "rating"
          ? [...deduped].sort(
              (a, b) =>
                avgRating(b.card) - avgRating(a.card) ||
                b.card.reviews.length - a.card.reviews.length ||
                b.score - a.score,
            )
          : deduped;

  const total = ordered.length;
  const slice = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
    ...s.card,
    alsoTeaches: s.alsoTeaches,
  }));
  return {
    tutors: slice,
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    resolved: { subject, location, country, level, board, keyword, mode, sort },
    locationRelaxed,
    keptCountry,
  };
}

export async function averageRateForSubject(subject: string) {
  const rows = await prisma.subjectProfile.findMany({
    where: {
      status: "ACTIVE",
      subject: { contains: subject, mode: "insensitive" },
      tutorProfile: publicListedTutorWhere(),
    },
    select: {
      rate: true,
      tutorProfile: {
        select: {
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
        },
      },
    },
  });
  const publicRows = rows.filter((row) =>
    canViewTutorProfilePublicly(tutorPublicVisibilityInput(row.tutorProfile)),
  );
  if (publicRows.length === 0) return null;
  return publicRows.reduce((s, p) => s + p.rate, 0) / publicRows.length;
}

export async function averageRatesBySubject(subjectNames: string[]) {
  const names = [...new Set(subjectNames.map((name) => name.trim()).filter(Boolean))];
  const empty = new Map<string, number | null>();
  for (const name of names) empty.set(name, null);
  if (names.length === 0) return empty;

  const rows = await prisma.subjectProfile.findMany({
    where: {
      status: "ACTIVE",
      tutorProfile: publicListedTutorWhere(),
    },
    select: {
      subject: true,
      rate: true,
      tutorProfile: {
        select: {
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
        },
      },
    },
  });

  const publicRows = rows.filter((row) =>
    canViewTutorProfilePublicly(tutorPublicVisibilityInput(row.tutorProfile)),
  );

  const totals = new Map<string, { sum: number; count: number }>();
  for (const name of names) totals.set(name, { sum: 0, count: 0 });

  for (const row of publicRows) {
    const hay = row.subject.toLowerCase();
    for (const name of names) {
      if (!hay.includes(name.toLowerCase())) continue;
      const bucket = totals.get(name)!;
      bucket.sum += row.rate;
      bucket.count += 1;
    }
  }

  const out = new Map<string, number | null>();
  for (const name of names) {
    const row = totals.get(name)!;
    out.set(name, row.count > 0 ? row.sum / row.count : null);
  }
  return out;
}

/** Where clause for similar listing recommendations. */
export function similarTutorsWhereClause(opts: {
  /** Subject listing id to exclude (preferred). */
  id?: string;
  /** Parent tutor account — excludes all of their listings. */
  excludeTutorProfileId?: string;
  subjects: string;
  location: string;
}) {
  const first = opts.subjects
    .split(/[,;/|]/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  const city = opts.location.split(/[/|,]/)[0]?.trim();
  const or = [
    ...(first ? [{ subject: { contains: first, mode: "insensitive" as const } }] : []),
    ...(city ? [{ location: { contains: city, mode: "insensitive" as const } }] : []),
  ];
  if (or.length === 0) return null;

  return {
    status: "ACTIVE" as const,
    ...(opts.id ? { id: { not: opts.id } } : {}),
    ...(opts.excludeTutorProfileId
      ? { tutorProfileId: { not: opts.excludeTutorProfileId } }
      : {}),
    OR: or,
    tutorProfile: publicListedTutorWhere(),
  };
}

export async function similarTutors(opts: {
  id?: string;
  excludeTutorProfileId?: string;
  subjects: string;
  location: string;
  take?: number;
}) {
  const where = similarTutorsWhereClause(opts);
  if (!where) return [];

  const rows = await prisma.subjectProfile.findMany({
    where,
    select: {
      id: true,
      subject: true,
      title: true,
      headline: true,
      description: true,
      level: true,
      location: true,
      country: true,
      online: true,
      inPerson: true,
      rate: true,
      status: true,
      highlightedUntil: true,
      boostUntil: true,
      tutorProfile: { select: LISTING_PARENT_SELECT },
    },
    take: (opts.take ?? 4) * 3,
    orderBy: [{ rate: "asc" }],
  });

  return (rows as ListingRow[])
    .filter(isPublicListing)
    .slice(0, opts.take ?? 4)
    .map((row) => toSearchCard(row));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export { listingPath };
