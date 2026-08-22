const PILLARS = [
  {
    title: "Curated discovery",
    desc: "Search by subject, board, city, and level — then compare tutors side by side with clear rates and reviews.",
  },
  {
    title: "Transparent pricing",
    desc: "Platform plans cover messaging and tools only. Lesson fees stay between you and your tutor.",
  },
  {
    title: "Global, local feel",
    desc: "From GCSE and IGCSE to Matric, FBISE, and university — tutors online or near you, priced locally.",
  },
  {
    title: "Built for exam season",
    desc: "Past papers, countdown tools, and direct tutor contact when revision matters most.",
  },
] as const;

export function PrestigePillars() {
  return (
    <section className="section prestige-pillars-section" aria-labelledby="prestige-pillars-title">
      <div className="container">
        <p className="eyebrow prestige-eyebrow">Why My Tutoring Hub</p>
        <h2 id="prestige-pillars-title">A world-class tutoring experience</h2>
        <p className="section-lead">
          Professional tools for students and tutors — designed to feel clear, trustworthy, and
          premium from the first search.
        </p>
        <div className="prestige-pillars">
          {PILLARS.map((pillar, i) => (
            <article key={pillar.title} className="prestige-pillar">
              <span className="prestige-pillar-num" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{pillar.title}</h3>
              <p className="muted">{pillar.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
