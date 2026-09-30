/**
 * READ-ONLY taxonomy audit for Teaching Profile subjects vs Past Paper metadata pollution.
 * Does not delete Subject rows. Optional --pause-paperish-profiles pauses polluted Teaching Profiles.
 *
 * Usage:
 *   npx tsx scripts/taxonomy-audit-readonly.ts [--write]
 *   npx tsx scripts/taxonomy-audit-readonly.ts --pause-paperish-profiles
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isPaperishSubjectLabel } from "../src/lib/subject-catalog";

async function main() {
  const prisma = new PrismaClient();
  const write = process.argv.includes("--write");
  const pausePaperish = process.argv.includes("--pause-paperish-profiles");
  try {
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { pastPapers: true } } },
      orderBy: { name: "asc" },
    });
    const profiles = await prisma.subjectProfile.findMany({
      select: { id: true, subject: true, canonicalSubject: true, status: true },
      take: 20000,
    });

    const paperishCatalog = subjects.filter(
      (s) => isPaperishSubjectLabel(s.name) || isPaperishSubjectLabel(s.slug || ""),
    );
    const paperishProfiles = profiles.filter(
      (p) => isPaperishSubjectLabel(p.subject) || isPaperishSubjectLabel(p.canonicalSubject),
    );
    const byName = new Map<string, typeof subjects>();
    for (const s of subjects) {
      const key = s.name.trim().toLowerCase();
      const list = byName.get(key) || [];
      list.push(s);
      byName.set(key, list);
    }
    const duplicateNames = [...byName.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([name, rows]) => ({
        name,
        ids: rows.map((r) => r.id),
        pastPaperCounts: rows.map((r) => r._count.pastPapers),
      }));

    let pausedProfiles = 0;
    if (pausePaperish) {
      const activeIds = paperishProfiles.filter((p) => p.status === "ACTIVE").map((p) => p.id);
      if (activeIds.length) {
        const result = await prisma.subjectProfile.updateMany({
          where: { id: { in: activeIds } },
          data: { status: "PAUSED" },
        });
        pausedProfiles = result.count;
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode: pausePaperish ? "pause-paperish-profiles" : "read-only",
      totals: {
        catalogSubjects: subjects.length,
        teachingProfilesSampled: profiles.length,
        paperishCatalogSubjects: paperishCatalog.length,
        paperishTeachingProfiles: paperishProfiles.length,
        duplicateCatalogNames: duplicateNames.length,
        pausedPaperishProfiles: pausedProfiles,
      },
      paperishCatalogSubjects: paperishCatalog.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        linkedPastPapers: s._count.pastPapers,
      })),
      paperishTeachingProfilesSample: paperishProfiles.slice(0, 100).map((p) => ({
        id: p.id,
        subject: p.subject,
        canonicalSubject: p.canonicalSubject,
        status: p.status,
      })),
      duplicateCatalogNames: duplicateNames.slice(0, 100),
      nextActions: [
        "Do not bulk-delete Subject rows yet — 0 linked papers is a good candidate set after a second review.",
        "Tutor pickers now filter paperish labels via isPaperishSubjectLabel / mergeSubjectNames.",
        "Re-map paused Teaching Profiles to a real teachable subject before reactivating.",
        "Keep Past Paper document types in past-paper taxonomy only.",
      ],
    };

    console.log(JSON.stringify(report.totals, null, 2));
    if (write || pausePaperish) {
      const out = resolve("docs/MTH-TAXONOMY-AUDIT-READONLY.json");
      writeFileSync(out, JSON.stringify(report, null, 2));
      console.log("Wrote", out);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
