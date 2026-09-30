/**
 * READ-ONLY taxonomy audit for Teaching Profile subjects vs Past Paper metadata pollution.
 * Does not delete or mutate data. Writes a JSON report under docs/ when run with --write.
 *
 * Usage: npx tsx scripts/taxonomy-audit-readonly.ts [--write]
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PAPERISH =
  /confidential instructions|examiner reports?|grade thresholds?|inserts?|mark schemes?|question papers?|feb(?:ruary)?[\/\s-]*mar(?:ch)?|may[\/\s-]*jun(?:e)?|oct(?:ober)?[\/\s-]*nov(?:ember)?|unknown session|^other$/i;

async function main() {
  const prisma = new PrismaClient();
  const write = process.argv.includes("--write");
  try {
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { pastPapers: true } } },
      orderBy: { name: "asc" },
    });
    const profiles = await prisma.subjectProfile.findMany({
      select: { id: true, subject: true, canonicalSubject: true, status: true },
      take: 20000,
    });

    const paperishCatalog = subjects.filter((s) => PAPERISH.test(s.name) || PAPERISH.test(s.slug || ""));
    const paperishProfiles = profiles.filter(
      (p) => PAPERISH.test(p.subject || "") || PAPERISH.test(p.canonicalSubject || ""),
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

    const report = {
      generatedAt: new Date().toISOString(),
      mode: "read-only",
      totals: {
        catalogSubjects: subjects.length,
        teachingProfilesSampled: profiles.length,
        paperishCatalogSubjects: paperishCatalog.length,
        paperishTeachingProfiles: paperishProfiles.length,
        duplicateCatalogNames: duplicateNames.length,
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
        "Do not bulk-delete: review paperish Subject rows carefully (they may only power Past Papers).",
        "Hide paper metadata from tutor subject pickers; keep teachable subjects only.",
        "Re-map Teaching Profiles whose subject/canonicalSubject looks like paper metadata.",
        "Keep Past Paper document types in past-paper taxonomy only.",
      ],
    };

    console.log(JSON.stringify(report.totals, null, 2));
    if (write) {
      const out = resolve("docs/MTH-TAXONOMY-AUDIT-READONLY.json");
      writeFileSync(out, JSON.stringify(report, null, 2));
      console.log("Wrote", out);
    } else {
      console.log("Pass --write to save docs/MTH-TAXONOMY-AUDIT-READONLY.json");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
