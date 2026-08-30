/**
 * P0 marketplace regression audit — read-only against production DB.
 * Usage: npx tsx scripts/marketplace-p0-audit.ts
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { searchTutors } from "../src/lib/search-tutors";
import {
  computeDesiredTutorPublicActive,
  filterCanonicallyPublicTutors,
  isCanonicallyPublicTutor,
  publicListedTutorWhere,
  tutorPublicVisibilityInput,
} from "../src/lib/tutor-public-eligibility";
import { isSuspiciousDisplayName } from "../src/lib/display-name";
import { getTutorProfileCompletion } from "../src/lib/tutor-profile-completion";
import { isTutorProfileListable } from "../src/lib/subscription";
import { formatHourly } from "../src/lib/currency";
import { formatTutorAvailability } from "../src/lib/tutor-catalog";

const SUSPICIOUS_SAMPLES = [
  "★★★★ http://spam.com",
  "Don\u{02022}\u{1D42C}\u{1D41B}\u{1D41D}\u{1D42B}\u{1D41E}\u{1D41D}\u{1D41C}-\u{1D41C}\u{1D41F}",
  "!!!@@@###",
  "x",
  "محمد أحمد",
  "Rajni Sairam",
];

async function main() {
  const allProfiles = await prisma.tutorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          suspended: true,
          role: true,
        },
      },
      subjectProfiles: {
        select: { status: true, subject: true, rate: true, online: true, inPerson: true },
      },
    },
  });

  const tutorAccounts = allProfiles.filter((p) => p.user.role === "TUTOR");
  const activeTrue = tutorAccounts.filter((p) => p.active);
  const publicCanonical = filterCanonicallyPublicTutors(tutorAccounts);
  const activeButIneligible = tutorAccounts.filter((p) => {
    if (!p.active) return false;
    return !isCanonicallyPublicTutor(p);
  });
  const eligibleButInactive = tutorAccounts.filter((p) => {
    if (p.active) return false;
    return isCanonicallyPublicTutor(p);
  });

  let incomplete = 0;
  let suspicious = 0;
  let unverified = 0;
  let suspended = 0;
  let completeButHidden = 0;

  const activeViolations: Array<{
    id: string;
    name: string;
    active: boolean;
    desiredActive: boolean;
    blockReasons: string[];
    forceActive: boolean;
  }> = [];

  for (const p of tutorAccounts) {
    const input = tutorPublicVisibilityInput(p);
    const assessment = computeDesiredTutorPublicActive(input);
    if (p.user.suspended) suspended += 1;
    if (!assessment.emailVerified) unverified += 1;
    if (assessment.suspiciousName) suspicious += 1;
    if (!assessment.complete) incomplete += 1;
    if (assessment.complete && !p.active && !p.user.suspended && assessment.desiredActive === false && !assessment.forceActiveOverride) {
      // complete but hidden for other reasons
    }
    if (assessment.complete && !p.active && assessment.blockReasons.length > 0) {
      completeButHidden += 1;
    }
    if (p.active !== assessment.desiredActive) {
      activeViolations.push({
        id: p.id,
        name: p.user.name || "(no name)",
        active: p.active,
        desiredActive: assessment.desiredActive,
        blockReasons: assessment.blockReasons,
        forceActive: Boolean(p.forceActive),
      });
    }
  }

  const listedWhere = await prisma.tutorProfile.findMany({
    where: publicListedTutorWhere(),
    include: {
      user: { select: { name: true, emailVerified: true, suspended: true } },
    },
  });
  const homepageStyleCount = filterCanonicallyPublicTutors(listedWhere).length;
  const searchResult = await searchTutors({}, { currency: "GBP" });
  const searchTotal = searchResult.total;
  const searchFails: Array<{ id: string; name: string; reasons: string[] }> = [];

  for (const t of searchResult.tutors) {
    const reasons: string[] = [];
    const full = tutorAccounts.find((p) => p.id === t.id);
    if (!full) {
      reasons.push("missing_profile");
    } else if (!isCanonicallyPublicTutor(full)) {
      reasons.push("not_canonically_public");
    }
    if (full && !full.user.emailVerified) reasons.push("email_unverified");
    if (full && full.user.suspended) reasons.push("suspended");
    if (full && isSuspiciousDisplayName(full.user.name || "")) reasons.push("suspicious_name");
    if (reasons.length) searchFails.push({ id: t.id, name: full?.user.name || t.id, reasons });
  }

  const verifiedPublic = publicCanonical.filter((p) => p.verified);
  const verifiedAudit: Array<{ id: string; name: string; verified: boolean; approvedRequest: boolean }> = [];
  for (const p of verifiedPublic) {
    const approved = await prisma.verificationRequest.findFirst({
      where: { userId: p.userId, status: "APPROVED" },
      select: { id: true },
    });
    verifiedAudit.push({
      id: p.id,
      name: p.user.name || "",
      verified: p.verified,
      approvedRequest: Boolean(approved),
    });
  }
  const invalidVerifiedBadges = verifiedAudit.filter((v) => v.verified && !v.approvedRequest);

  const rateDupes: string[] = [];
  for (const t of searchResult.tutors) {
    const line = formatHourly(t.hourlyRate, "GBP");
    if (line.includes("/hr/hr") || line.includes("/ hour") || /\/hr\/ hour/.test(line)) {
      rateDupes.push(`${t.id}: ${line}`);
    }
  }

  const locationDupes: string[] = [];
  for (const t of searchResult.tutors) {
    const line = formatTutorAvailability({
      location: t.location,
      country: t.country,
      online: t.online,
      inPerson: t.inPerson,
    });
    if (/Online.*Online/i.test(line) || line.includes("Online · Online")) {
      locationDupes.push(`${t.id}: ${line}`);
    }
  }

  const suspiciousSamples = SUSPICIOUS_SAMPLES.map((name) => ({
    name,
    suspicious: isSuspiciousDisplayName(name),
  }));

  const publicSuspicious = publicCanonical.filter((p) =>
    isSuspiciousDisplayName(p.user.name || ""),
  );

  const featuredRaw = await prisma.tutorProfile.findMany({
    where: publicListedTutorWhere(),
    orderBy: [{ highlighted: "desc" }, { verified: "desc" }],
    take: 3,
    include: { user: { select: { name: true, emailVerified: true, suspended: true } } },
  });
  const featuredPublic = filterCanonicallyPublicTutors(featuredRaw);

  const out = {
    generatedAt: new Date().toISOString(),
    supply: {
      totalTutorAccounts: tutorAccounts.length,
      activeTrue: activeTrue.length,
      canonicallyPublic: publicCanonical.length,
      incomplete,
      suspiciousHidden: tutorAccounts.filter(
        (p) => isSuspiciousDisplayName(p.user.name || "") && !p.active,
      ).length,
      unverifiedEmail: tutorAccounts.filter((p) => !p.user.emailVerified).length,
      suspended,
      completeButHidden,
      activeButIneligible: activeButIneligible.length,
      eligibleButInactive: eligibleButInactive.length,
    },
    homepageVsSearch: {
      homepageStyleCount,
      searchTotal,
      match: homepageStyleCount === searchTotal,
    },
    invariantPublicEqualsCanonical: activeViolations.length === 0,
    activeViolations,
    searchFails,
    publicSuspicious: publicSuspicious.map((p) => ({
      id: p.id,
      name: p.user.name,
    })),
    suspiciousSamples,
    verifiedChecked: verifiedAudit.length,
    invalidVerifiedBadges,
    rateDupes,
    locationDupes,
    featuredCount: featuredPublic.length,
    featuredNotPublic: featuredRaw
      .filter((p) => !isCanonicallyPublicTutor(p))
      .map((p) => ({ id: p.id, name: p.user.name })),
  };

  console.log(JSON.stringify(out, null, 2));
  writeFileSync("tmp_marketplace_p0_audit.json", JSON.stringify(out, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
