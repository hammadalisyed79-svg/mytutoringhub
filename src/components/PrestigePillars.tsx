const PILLARS = [
  {
    title: "Search by what you need",
    desc: "Filter tutors by subject, exam board, city, and level — with clear rates and reviews.",
    icon: "◎",
  },
  {
    title: "No commission on lessons",
    desc: "Platform plans cover messaging and tools only. You pay your tutor directly for lessons.",
    icon: "◈",
  },
  {
    title: "Boards students actually sit",
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
        <h2 id="prestige-pillars-title">Clear tools. Direct contact.</h2>
        <p className="section-lead">
          Find tutors, prepare with past papers, and message when you are ready — without lesson
          fees going through us.
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
