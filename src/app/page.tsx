import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HeroSearch } from "@/components/HeroSearch";
import { LogoMark } from "@/components/Logo";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { POPULAR_SUBJECTS, SUBJECT_CATEGORIES, TESTIMONIALS } from "@/lib/marketing";

export default async function HomePage() {
  const currency = await getVisitorCurrency();
  const [tutorCount, studentCount, openAds] = await Promise.all([
    prisma.tutorProfile.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.studentAd.count({ where: { status: "OPEN" } }),
  ]);

  const featured = await prisma.tutorProfile.findMany({
    where: { active: true },
    take: 3,
    orderBy: [{ highlighted: "desc" }, { verified: "desc" }],
    include: {
      user: { select: { name: true } },
      reviews: { select: { rating: true } },
    },
  });

  return (
    <>
      <section className="hero hero-findtutor">
        <div className="hero-content">
          <div className="hero-brand-row">
            <LogoMark className="hero-brand-mark" />
            <p className="hero-kicker">Private lessons & tutors</p>
          </div>
          <h1>My Tutoring Hub</h1>
          <p>
            Connect with trusted private tutors worldwide — boards, languages, and exam prep.
            Online or at home. Prices shown in your local currency.
          </p>
          <HeroSearch />
        </div>
      </section>

      <section className="section section-stats">
        <div className="container stats-row">
          <div>
            <strong>{Math.max(tutorCount, 1).toLocaleString()}+</strong>
            <span>Active tutors</span>
          </div>
          <div>
            <strong>{Math.max(studentCount, 1).toLocaleString()}+</strong>
            <span>Students joined</span>
          </div>
          <div>
            <strong>{openAds}</strong>
            <span>Open student requests</span>
          </div>
          <div>
            <strong>350+</strong>
            <span>Subjects & skills</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Find and contact private tutors</h2>
          <p className="section-lead">
            Browse profiles, compare rates, message tutors with a Student Pass, then arrange
            lessons directly — we never take a lesson commission.
          </p>
          <div className="feature-split">
            <article>
              <h3>Choose the perfect tutor</h3>
              <p className="muted">
                Filter by subject, city or online, budget, and verified badges.
              </p>
            </article>
            <article>
              <h3>Learn at your own pace</h3>
              <p className="muted">
                Fully personalised private lessons tailored to your goals and schedule.
              </p>
            </article>
            <article>
              <h3>Online or in person</h3>
              <p className="muted">
                Video lessons from home, or meet a local tutor near you.
              </p>
            </article>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Featured tutors</h2>
                <p className="section-lead">Highlighted and verified profiles students love.</p>
              </div>
              <Link href="/search" className="btn btn-secondary">
                See all tutors
              </Link>
            </div>
            <div className="tutor-grid">
              {featured.map((t) => {
                const avg =
                  t.reviews.length > 0
                    ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                    : null;
                return (
                  <Link key={t.id} href={`/tutors/${t.id}`} className="tutor-card">
                    <div className="tutor-avatar" aria-hidden>
                      {t.user.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="meta">
                        {t.verified && <span className="badge">Verified</span>}
                        {t.highlighted && <span className="badge accent">Highlighted</span>}
                      </div>
                      <h3>{t.user.name}</h3>
                      <p>{t.headline || t.subjects}</p>
                      <div className="meta">
                        <span>{formatHourly(t.hourlyRate, currency)}</span>
                        {avg !== null && <span>{avg.toFixed(1)} ★</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <h2>Private lessons for every goal</h2>
          <p className="section-lead">
            School boards, O/A Levels, IELTS, SAT, languages, and university subjects — learn online
            or in person.
          </p>
          <div className="subject-chips">
            {POPULAR_SUBJECTS.map((s) => (
              <Link key={s} href={`/search?subject=${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
          </div>
          <div className="subject-cats">
            {SUBJECT_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <h3>{cat.title}</h3>
                <ul>
                  {cat.items.map((item) => (
                    <li key={item.slug}>
                      <Link href={`/search?subject=${encodeURIComponent(item.slug)}`}>
                        {item.name} tutors
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="section-actions">
            <Link href="/subjects" className="btn btn-secondary">
              Browse all subjects
            </Link>
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>How MyTutoringHub works</h2>
          <p className="section-lead">Search, contact, and arrange lessons in three clear steps.</p>
          <div className="steps">
            <div className="step">
              <span>1</span>
              <h3>Search</h3>
              <p className="muted">Tell us what you want to learn and pick tutors that fit your needs.</p>
            </div>
            <div className="step">
              <span>2</span>
              <h3>Contact</h3>
              <p className="muted">
                With a Student Pass, message as many tutors as you like and compare replies.
              </p>
            </div>
            <div className="step">
              <span>3</span>
              <h3>Learn</h3>
              <p className="muted">
                Arrange lessons and pay your tutor directly — keep it personal and flexible.
              </p>
            </div>
          </div>
          <p className="section-actions">
            <Link href="/how-it-works" className="btn">
              See how it works
            </Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Why families choose MyTutoringHub</h2>
          <div className="testimonial-grid">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="testimonial">
                <p>“{t.quote}”</p>
                <footer>
                  <strong>{t.name}</strong>
                  <span className="muted">{t.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="container cta-band-inner">
          <div>
            <h2>Are you a tutor? Start teaching</h2>
            <p>
              Create your profile, get a Tutor Basic plan, and optional Verified / Highlighted
              upgrades. You keep 100% of lesson fees.
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/become-a-tutor" className="btn">
              Become a tutor
            </Link>
            <Link href="/ads" className="btn btn-secondary">
              See student requests
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
