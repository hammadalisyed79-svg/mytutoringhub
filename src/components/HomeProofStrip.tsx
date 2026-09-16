import { CURRICULUM } from "@/lib/curriculum";
import { prisma } from "@/lib/prisma";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";

/** Compact homepage trust row — plain labels students understand. */
export async function HomeProofStrip() {
  const curriculumCodeCount = CURRICULUM.length;
  const pastPaperCount = await prisma.pastPaper.count({ where: publicAvailabilityWhere() });

  const stats = [
    curriculumCodeCount > 0 && {
      value: curriculumCodeCount.toLocaleString(),
      label: "Exam & syllabus codes",
    },
    pastPaperCount > 0 && {
      value: pastPaperCount.toLocaleString(),
      label: pastPaperCount === 1 ? "Past paper to practice" : "Past papers to practice",
    },
  ].filter(Boolean) as { value: string; label: string }[];

  if (stats.length === 0) return null;

  return (
    <section className="home-proof-strip" aria-label="What you can use on My Tutoring Hub">
      <div className="container home-proof-strip-inner">
        {stats.map((stat) => (
          <p key={stat.label} className="home-proof-item">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </p>
        ))}
        <p className="home-proof-item home-proof-item--text">
          <strong>Free to search</strong>
          <span>Message within your monthly contacts</span>
        </p>
      </div>
    </section>
  );
}
