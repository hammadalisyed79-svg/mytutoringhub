/**
 * Delete orphan paperish Subject catalog rows (0 linked past papers, not used as teachable subjects).
 * Default dry-run. Usage:
 *   npx tsx scripts/delete-paperish-orphan-subjects.ts
 *   npx tsx scripts/delete-paperish-orphan-subjects.ts --apply --write
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isPaperishSubjectLabel } from "../src/lib/subject-catalog";

config();
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  const write = process.argv.includes("--write");

  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { pastPapers: true } },
    },
  });

  const candidates = subjects.filter(
    (s) =>
      (isPaperishSubjectLabel(s.name) || isPaperishSubjectLabel(s.slug)) &&
      s._count.pastPapers === 0,
  );

  // Never delete if any Teaching Profile still uses the label (even paused).
  const profiles = await prisma.subjectProfile.findMany({
    where: {
      OR: candidates.flatMap((s) => [
        { subject: { equals: s.name, mode: "insensitive" as const } },
        { canonicalSubject: { equals: s.name, mode: "insensitive" as const } },
      ]),
    },
    select: { id: true, subject: true, canonicalSubject: true, status: true },
  });
  const blockedNames = new Set(
    profiles.flatMap((p) =>
      [p.subject, p.canonicalSubject].filter(Boolean).map((v) => v!.trim().toLowerCase()),
    ),
  );

  const deletable = candidates.filter((s) => !blockedNames.has(s.name.trim().toLowerCase()));
  const blocked = candidates.filter((s) => blockedNames.has(s.name.trim().toLowerCase()));

  let deleted = 0;
  if (apply && deletable.length) {
    const result = await prisma.subject.deleteMany({
      where: { id: { in: deletable.map((s) => s.id) } },
    });
    deleted = result.count;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    candidates: candidates.length,
    deletable: deletable.length,
    blockedByTeachingProfiles: blocked.length,
    deleted,
    deletableRows: deletable,
    blockedRows: blocked,
    remainingProfiles: profiles,
  };

  console.log(JSON.stringify(report, null, 2));
  if (write) {
    const out = resolve("docs/MTH-PAPERISH-SUBJECT-DELETE.json");
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log("Wrote", out);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
