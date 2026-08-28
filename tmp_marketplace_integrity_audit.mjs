/**
 * READ-ONLY marketplace integrity audit — writes tmp_marketplace_integrity_audit.json
 * No DB writes, no emails.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const { prisma } = await import("./src/lib/prisma.ts");
const { computeDesiredTutorPublicActive, publicListedTutorWhere } = await import(
  "./src/lib/tutor-public-eligibility.ts"
);
const { getTutorProfileCompletion, isTutorProfileStarted } = await import(
  "./src/lib/tutor-profile-completion.ts"
);
const { isSuspiciousDisplayName } = await import("./src/lib/display-name.ts");
const { searchTutors, similarTutors } = await import("./src/lib/search-tutors.ts");
const { formatTutorPlace, formatTutorAvailability } = await import("./src/lib/tutor-catalog.ts");
const { formatHourly } = await import("./src/lib/currency.ts");
const { NURTURE_SEQUENCES } = await import("./src/lib/email-nurture.ts");

function splitSubjects(raw) {
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function lessonMode(online, inPerson) {
  if (online && inPerson) return "Online + In person";
  if (online) return "Online";
  if (inPerson) return "In person";
  return "Unspecified";
}

function pct(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function detectFormattingDefects(t) {
  const defects = [];
  const place = formatTutorPlace(t.location, t.country);
  const availability = formatTutorAvailability({
    location: t.location,
    country: t.country,
    online: t.online,
    inPerson: t.inPerson,
  });
  const hourly = formatHourly(t.hourlyRate, "USD");

  if (/Online\s*·\s*Online/i.test(availability)) defects.push("duplicate_online_in_availability");
  if (/,\s*Online\s*,\s*Online/i.test(place)) defects.push("duplicate_online_in_place");
  if (place && t.country && place.toLowerCase() === t.country.toLowerCase() && t.location?.toLowerCase() !== t.country?.toLowerCase()) {
    // ok dedup
  }
  if (!place && !t.online) defects.push("blank_location");
  if (!t.headline?.trim()) defects.push("empty_headline");
  if (!splitSubjects(t.subjects).length) defects.push("empty_subjects");
  if (!t.photoUrl?.startsWith("https://")) defects.push("missing_or_invalid_avatar");
  if (t.hourlyRate == null || t.hourlyRate < 500) defects.push("malformed_or_low_rate");
  if (hourly.includes("/hr/hr")) defects.push("duplicated_hr_suffix");
  if (availability.match(/·/g)?.length > 3) defects.push("excessive_availability_segments");

  const loc = (t.location || "").trim().toLowerCase();
  const ctry = (t.country || "").trim().toLowerCase();
  if (loc && ctry && loc !== "online" && loc === ctry) defects.push("duplicate_city_country_raw");

  return { place, availability, hourly, defects };
}

const profiles = await prisma.tutorProfile.findMany({
  include: {
    user: {
      select: {
        id: true,
        name: true,
        emailVerified: true,
        suspended: true,
        role: true,
        updatedAt: true,
      },
    },
  },
  orderBy: { updatedAt: "desc" },
});

const tutorProfiles = profiles.filter((p) => p.user.role === "TUTOR");

let forceActiveCount = 0;
let completeButHidden = 0;
let incompleteButActive = 0;
let emailUnverifiedHidden = 0;
const mismatches = { B: [], C: [], D: [], E: [] };
const publicTutors = [];
const hiddenBuckets = {
  incomplete: 0,
  suspicious: 0,
  suspended: 0,
  unverified: 0,
  completeButHiddenList: [],
};

for (const p of tutorProfiles) {
  const assessment = computeDesiredTutorPublicActive({
    forceActive: p.forceActive,
    emailVerified: p.user.emailVerified,
    name: p.user.name,
    photoUrl: p.photoUrl,
    headline: p.headline,
    bio: p.bio,
    country: p.country,
    location: p.location,
    subjects: p.subjects,
    hourlyRate: p.hourlyRate,
    online: p.online,
    inPerson: p.inPerson,
    qualifications: p.qualifications,
    suspended: p.user.suspended,
  });
  const completion = getTutorProfileCompletion({
    name: p.user.name,
    photoUrl: p.photoUrl,
    headline: p.headline,
    bio: p.bio,
    country: p.country,
    location: p.location,
    subjects: p.subjects,
    hourlyRate: p.hourlyRate,
    online: p.online,
    inPerson: p.inPerson,
    qualifications: p.qualifications,
  });

  if (p.forceActive) forceActiveCount += 1;
  if (p.active && !assessment.desiredActive) {
    mismatches.C.push({ profileId: p.id, displayName: p.user.name, reasons: assessment.blockReasons, forceActive: p.forceActive });
    incompleteButActive += 1;
  }
  if (!p.active && assessment.desiredActive) {
    mismatches.D.push({ profileId: p.id, displayName: p.user.name, reasons: assessment.blockReasons, forceActive: p.forceActive });
  }
  if (assessment.forceActiveOverride) {
    mismatches.E.push({ profileId: p.id, displayName: p.user.name, reasons: assessment.blockReasons });
  }
  if (!p.active && completion.complete && !p.user.suspended && !assessment.suspiciousName) {
    completeButHidden += 1;
    hiddenBuckets.completeButHiddenList.push({ profileId: p.id, displayName: p.user.name, emailVerified: !!p.user.emailVerified });
  }

  if (!p.active) {
    if (p.user.suspended) hiddenBuckets.suspended += 1;
    else if (isSuspiciousDisplayName(p.user.name)) hiddenBuckets.suspicious += 1;
    else if (!p.user.emailVerified) {
      hiddenBuckets.unverified += 1;
      emailUnverifiedHidden += 1;
    } else if (!completion.complete) hiddenBuckets.incomplete += 1;
  }

  if (p.active) {
    const fmt = detectFormattingDefects(p);
    publicTutors.push({
      displayName: p.user.name || "(empty)",
      profileId: p.id,
      subjects: splitSubjects(p.subjects),
      city: p.location || "",
      country: p.country || "",
      lessonMode: lessonMode(p.online, p.inPerson),
      hourlyRatePkr: p.hourlyRate,
      emailVerified: !!p.user.emailVerified,
      completenessPct: pct(completion.requiredDone, completion.requiredTotal),
      verifiedBadge: !!p.verified,
      forceActive: !!p.forceActive,
      eligibility: assessment.desiredActive === p.active ? "A_valid_public" : "B_active_mismatch",
      formatting: fmt,
    });
  }
}

// Recovery Email 1 snapshot
const r1Events = await prisma.emailSequenceEvent.findMany({
  where: { sequence: NURTURE_SEQUENCES.TUTOR_PROFILE_R1 },
  orderBy: { sentAt: "desc" },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        suspended: true,
        emailVerified: true,
        tutorProfile: true,
        updatedAt: true,
      },
    },
  },
});

const recoverySnapshot = [];
for (const ev of r1Events) {
  const tp = ev.user.tutorProfile;
  if (!tp) continue;
  const completion = getTutorProfileCompletion({ ...tp, name: ev.user.name });
  const assessment = computeDesiredTutorPublicActive({
    forceActive: tp.forceActive,
    emailVerified: ev.user.emailVerified,
    name: ev.user.name,
    photoUrl: tp.photoUrl,
    headline: tp.headline,
    bio: tp.bio,
    country: tp.country,
    location: tp.location,
    subjects: tp.subjects,
    hourlyRate: tp.hourlyRate,
    online: tp.online,
    inPerson: tp.inPerson,
    qualifications: tp.qualifications,
    suspended: ev.user.suspended,
  });
  const editedSinceR1 = tp.updatedAt > ev.sentAt;
  recoverySnapshot.push({
    userId: ev.user.id,
    displayName: ev.user.name,
    r1SentAt: ev.sentAt,
    stillIncomplete: !completion.complete,
    completenessPct: pct(completion.requiredDone, completion.requiredTotal),
    nowLive: tp.active && assessment.desiredActive,
    editedSinceR1,
    missingRequired: completion.missingRequired,
  });
}

// Subject supply from public tutors
const subjectSupply = new Map();
for (const t of publicTutors) {
  for (const s of t.subjects) {
    subjectSupply.set(s, (subjectSupply.get(s) || 0) + 1);
  }
}

// Search tests for subjects with live tutors
const searchTests = [];
const testedSubjects = [...subjectSupply.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
for (const [subject, expected] of testedSubjects) {
  const result = await searchTutors({ subject, page: "1" });
  const names = result.tutors.map((t) => t.user.name);
  searchTests.push({
    subject,
    expectedFromDb: expected,
    searchTotal: result.total,
    namesReturned: names,
    match: result.total >= expected,
  });
}

// no-subject, online mode
const noSubject = await searchTutors({ page: "1" });
const onlineOnly = await searchTutors({ mode: "online", page: "1" });

// per-country/city from public tutors
const countryTests = [];
const seenCountries = new Set();
for (const t of publicTutors) {
  const c = t.country?.trim();
  if (!c || seenCountries.has(c)) continue;
  seenCountries.add(c);
  const result = await searchTutors({ country: c, page: "1" });
  countryTests.push({ country: c, expectedMin: 1, searchTotal: result.total, names: result.tutors.map((x) => x.user.name) });
  if (countryTests.length >= 5) break;
}

const cityTests = [];
const seenCities = new Set();
for (const t of publicTutors) {
  const city = t.city?.trim();
  if (!city || city.toLowerCase() === "online" || seenCities.has(city)) continue;
  seenCities.add(city);
  const result = await searchTutors({ location: city, page: "1" });
  cityTests.push({ city, country: t.country, searchTotal: result.total, names: result.tutors.map((x) => x.user.name) });
  if (cityTests.length >= 5) break;
}

// Similar tutors check for each public profile
const similarChecks = [];
for (const t of publicTutors) {
  const p = tutorProfiles.find((x) => x.id === t.profileId);
  const related = await similarTutors({ id: t.profileId, subjects: p.subjects, location: p.location, take: 6 });
  for (const r of related) {
    const ra = computeDesiredTutorPublicActive({
      forceActive: r.forceActive ?? tutorProfiles.find((x) => x.id === r.id)?.forceActive,
      emailVerified: r.user?.emailVerified,
      name: r.user.name,
      photoUrl: r.photoUrl,
      headline: r.headline,
      bio: tutorProfiles.find((x) => x.id === r.id)?.bio,
      country: r.country,
      location: r.location,
      subjects: r.subjects,
      hourlyRate: r.hourlyRate,
      online: tutorProfiles.find((x) => x.id === r.id)?.online,
      inPerson: tutorProfiles.find((x) => x.id === r.id)?.inPerson,
      qualifications: tutorProfiles.find((x) => x.id === r.id)?.qualifications,
      suspended: false,
    });
    const full = tutorProfiles.find((x) => x.id === r.id);
    const assessment = full
      ? computeDesiredTutorPublicActive({
          forceActive: full.forceActive,
          emailVerified: full.user.emailVerified,
          name: full.user.name,
          photoUrl: full.photoUrl,
          headline: full.headline,
          bio: full.bio,
          country: full.country,
          location: full.location,
          subjects: full.subjects,
          hourlyRate: full.hourlyRate,
          online: full.online,
          inPerson: full.inPerson,
          qualifications: full.qualifications,
          suspended: full.user.suspended,
        })
      : ra;
    similarChecks.push({
      sourceProfileId: t.profileId,
      sourceName: t.displayName,
      relatedProfileId: r.id,
      relatedName: r.user.name,
      relatedActive: full?.active ?? null,
      relatedSuspended: full?.user.suspended ?? null,
      eligible: assessment.desiredActive && full?.active,
      ok: full?.active && assessment.desiredActive && !full.user.suspended,
    });
  }
}

// Sitemap DB ids
const sitemapDbIds = (
  await prisma.tutorProfile.findMany({ where: publicListedTutorWhere(), select: { id: true } })
).map((x) => x.id).sort();

const publicIds = publicTutors.map((t) => t.profileId).sort();

const inactiveProfiles = tutorProfiles.filter((p) => !p.active).map((p) => p.id);

// Subject landing expectations
const subjectLandings = [];
for (const [subject, count] of testedSubjects.slice(0, 6)) {
  const result = await searchTutors({ subject, page: "1" });
  subjectLandings.push({
    subject,
    slugGuess: subject.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    expectedCount: count,
    searchTotal: result.total,
    tutorIds: result.tutors.map((t) => t.id),
    tutorNames: result.tutors.map((t) => t.user.name),
  });
}

const counts = {
  totalTutorAccounts: await prisma.user.count({ where: { role: "TUTOR" } }),
  livePublic: publicTutors.length,
  incompleteHidden: hiddenBuckets.incomplete,
  suspiciousHidden: hiddenBuckets.suspicious,
  suspended: hiddenBuckets.suspended,
  emailUnverifiedHidden,
  forceActive: forceActiveCount,
  completeButHidden,
  incompleteButActive,
  profilesWithTutorRole: tutorProfiles.length,
};

const formattingDefects = publicTutors
  .filter((t) => t.formatting.defects.length)
  .map((t) => ({
    profileId: t.profileId,
    displayName: t.displayName,
    defects: t.formatting.defects,
    availability: t.formatting.availability,
    hourly: t.formatting.hourly,
  }));

const out = {
  generatedAt: new Date().toISOString(),
  counts,
  publicTutors: publicTutors.map(({ formatting, ...rest }) => ({
    ...rest,
    place: formatting.place,
    availability: formatting.availability,
    hourlyUsd: formatting.hourly,
    formattingDefects: formatting.defects,
  })),
  eligibilityMismatches: mismatches,
  subjectSupply: Object.fromEntries(subjectSupply),
  searchTests: { bySubject: searchTests, noSubject: { total: noSubject.total }, online: { total: onlineOnly.total }, countryTests, cityTests },
  subjectLandings,
  similarChecks,
  sitemap: {
    dbPublicCount: sitemapDbIds.length,
    publicAuditCount: publicIds.length,
    idsMatch: JSON.stringify(sitemapDbIds) === JSON.stringify(publicIds),
    missingFromSitemap: publicIds.filter((id) => !sitemapDbIds.includes(id)),
    extraInSitemap: sitemapDbIds.filter((id) => !publicIds.includes(id)),
    inactiveProfileCount: inactiveProfiles.length,
  },
  recovery: {
    r1TotalEvents: r1Events.length,
    recipients: recoverySnapshot,
    stillIncomplete: recoverySnapshot.filter((r) => r.stillIncomplete).length,
    editedSinceR1: recoverySnapshot.filter((r) => r.editedSinceR1).length,
    nowLive: recoverySnapshot.filter((r) => r.nowLive).length,
    nearlyComplete: recoverySnapshot.filter((r) => r.completenessPct >= 70 && r.stillIncomplete).length,
    earlyProfile: recoverySnapshot.filter((r) => r.completenessPct < 40).length,
  },
  completeButHidden: hiddenBuckets.completeButHiddenList,
};

writeFileSync("tmp_marketplace_integrity_audit.json", JSON.stringify(out, null, 2));
console.log("Wrote tmp_marketplace_integrity_audit.json");
console.log(JSON.stringify({ counts, r1: out.recovery, mismatches: { C: mismatches.C.length, D: mismatches.D.length, E: mismatches.E.length }, sitemap: out.sitemap }, null, 2));

await prisma.$disconnect();
