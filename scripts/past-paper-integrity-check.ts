/**
 * Read-only Past Paper integrity audit — does NOT mutate records.
 * Reports blank fields and obvious board/subject/syllabus mismatches.
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const total = await prisma.pastPaper.count();
  const blankBoard = await prisma.pastPaper.count({ where: { board: "" } });
  const blankSubject = await prisma.pastPaper.count({ where: { subject: "" } });
  const nullQual = await prisma.pastPaper.count({ where: { qualification: null } });
  const blankQual = await prisma.pastPaper.count({ where: { qualification: "" } });
  const nullSyllabus = await prisma.pastPaper.count({ where: { syllabusCode: null } });
  const blankSyllabus = await prisma.pastPaper.count({ where: { syllabusCode: "" } });

  const scienceWithCsCode = await prisma.pastPaper.findMany({
    where: {
      subject: { equals: "Science", mode: "insensitive" },
      OR: [
        { syllabusCode: { contains: "0478" } },
        { syllabusCode: { contains: "9618" } },
        { syllabusCode: { contains: "0984" } },
        { syllabusCode: { contains: "2210" } },
      ],
    },
    take: 25,
    select: {
      id: true,
      board: true,
      subject: true,
      qualification: true,
      syllabusCode: true,
      year: true,
    },
  });

  const boardLooksLikeSubject = await prisma.pastPaper.findMany({
    where: {
      OR: [
        { board: { equals: "Mathematics", mode: "insensitive" } },
        { board: { equals: "Physics", mode: "insensitive" } },
        { board: { equals: "Chemistry", mode: "insensitive" } },
        { board: { equals: "Biology", mode: "insensitive" } },
        { board: { equals: "Science", mode: "insensitive" } },
        { board: { equals: "Computer Science", mode: "insensitive" } },
      ],
    },
    take: 25,
    select: {
      id: true,
      board: true,
      subject: true,
      qualification: true,
      syllabusCode: true,
    },
  });

  const codeWithoutSubject = await prisma.pastPaper.count({
    where: {
      AND: [
        { syllabusCode: { not: null } },
        { NOT: { syllabusCode: "" } },
        { subject: "" },
      ],
    },
  });

  const topBoards = await prisma.pastPaper.groupBy({
    by: ["board"],
    _count: true,
    orderBy: { _count: { board: "desc" } },
    take: 15,
  });
  const topSubjects = await prisma.pastPaper.groupBy({
    by: ["subject"],
    _count: true,
    orderBy: { _count: { subject: "desc" } },
    take: 15,
  });

  // Subject text is Computer Science but qualification/board text claims Combined Science etc.
  const csVsScienceLabel = await prisma.pastPaper.findMany({
    where: {
      subject: { contains: "Computer Science", mode: "insensitive" },
      OR: [
        { qualification: { contains: "Combined Science", mode: "insensitive" } },
        { qualification: { equals: "Science", mode: "insensitive" } },
      ],
    },
    take: 20,
    select: {
      id: true,
      board: true,
      subject: true,
      qualification: true,
      syllabusCode: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        total,
        blankBoard,
        blankSubject,
        nullQual,
        blankQual,
        nullSyllabus,
        blankSyllabus,
        codeWithoutSubject,
        scienceWithCsCodeCount: scienceWithCsCode.length,
        scienceWithCsCode,
        boardLooksLikeSubjectCount: boardLooksLikeSubject.length,
        boardLooksLikeSubjectSample: boardLooksLikeSubject.slice(0, 10),
        csVsScienceLabelCount: csVsScienceLabel.length,
        csVsScienceLabel,
        topBoards,
        topSubjects,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
