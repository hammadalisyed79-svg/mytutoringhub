import { CURRICULUM } from "@/lib/curriculum";
import { prisma } from "@/lib/prisma";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";

export async function HomeProofStrip() {
  const curriculumCodeCount = CURRICULUM.length;
  const pastPaperCount = await prisma.pastPaper.count({ where: publicAvailabilityWhere() });

  const stats = [
    curriculumCodeCount > 0 && {
      value: curriculumCodeCount.toLocaleString(),
      label: "Curriculum subject codes",
    },
    pastPaperCount > 0 && {
      value: pastPaperCount.toLocaleString(),
      label: pastPaperCount === 1 ? "Past paper" : "Past papers",
    },
  ].filter(Boolean) as { value: string; label: string }[];

  if (stats.length === 0) return null;

  return (
    <section className="home-proof-strip" aria-label="Platform facts">
      <div className="container home-proof-strip-inner">
        {stats.map((stat) => (
          <p key={stat.label} className="home-proof-item">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
