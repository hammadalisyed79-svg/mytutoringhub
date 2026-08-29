const PILLARS = [
  {
    title: "Curated discovery",
    desc: "Search by subject, board, city, and level — compare clear rates and reviews.",
    icon: "◎",
  },
  {
    title: "Transparent pricing",
    desc: "Plans cover messaging and tools only. Lesson fees stay between you and your tutor.",
    icon: "◈",
  },
  {
    title: "Global, local feel",
    desc: "From GCSE and IGCSE to Matric, FBISE, and university — online or near you.",
    icon: "◉",
  },
  {
    title: "Built for exam season",
    desc: "Past papers, countdown tools, and direct tutor contact when revision matters.",
    icon: "✦",
  },
] as const;

export function PrestigePillars({ curriculaLine }: { curriculaLine: string }) {
  const pillars = [
    PILLARS[0],
    PILLARS[1],
    { ...PILLARS[2], desc: curriculaLine },
    PILLARS[3],
  ] as const;

  return (
    <section className="section prestige-pillars-section" aria-labelledby="prestige-pillars-title">
      <div className="container">
        <p className="eyebrow prestige-eyebrow">Why My Tutoring Hub</p>
        <h2 id="prestige-pillars-title">A world-class tutoring experience</h2>
        <p className="section-lead">
          Clear tools for students and tutors — trustworthy from the first search.
        </p>
        <div className="prestige-pillars prestige-pillars--split">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="prestige-pillar prestige-pillar--row">
              <span className="prestige-pillar-icon" aria-hidden>
                {pillar.icon}
              </span>
              <div>
                <h3>{pillar.title}</h3>
                <p className="muted">{pillar.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
