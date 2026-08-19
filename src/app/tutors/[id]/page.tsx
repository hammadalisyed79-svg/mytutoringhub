import { notFound } from "next/navigation";
import { TutorAvatar } from "@/components/TutorAvatar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactTutorForm } from "@/components/ContactTutorForm";
import { ReviewForm } from "@/components/ReviewForm";
import { ReportButton } from "@/components/ReportButton";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { similarTutors, slugify } from "@/lib/search-tutors";
import { embedVideoSrc, openStreetMapEmbed } from "@/lib/media";
import { formatTutorPlace } from "@/lib/tutor-catalog";
import { formatAvailabilityLines, formatExperienceYears } from "@/lib/availability";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function splitList(value?: string | null) {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function stars(rating: number) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(n);
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!tutor) return { title: "Tutor" };
  const description =
    tutor.headline ||
    `${tutor.user.name} — ${tutor.subjects} tutor in ${formatTutorPlace(tutor.location, tutor.country)}. Private lessons on My Tutoring Hub.`;
  return {
    title: `${tutor.user.name} — private tutor`,
    description: description.slice(0, 160),
  };
}

export default async function TutorProfilePage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const currency = await getVisitorCurrency();
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: { student: { select: { name: true } } },
      },
      ads: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!tutor) notFound();

  const viewerId = session?.user?.id;
  const isOwner = Boolean(viewerId && viewerId === tutor.userId);
  const isAdmin = session?.user?.role === "ADMIN";
  if (!tutor.active && !isOwner && !isAdmin) notFound();

  const avg =
    tutor.reviews.length > 0
      ? tutor.reviews.reduce((s, r) => s + r.rating, 0) / tutor.reviews.length
      : null;

  const highlighted =
    tutor.highlighted || (tutor.highlightedUntil && tutor.highlightedUntil > new Date());

  const subjects = splitList(tutor.subjects);
  const expertise = splitList(tutor.expertise);
  const levels = splitList(tutor.levels);
  const languages = splitList(tutor.languages);
  const place = formatTutorPlace(tutor.location, tutor.country);
  const availabilityLines = formatAvailabilityLines(tutor.availability);
  const experienceLabel = formatExperienceYears(tutor.experienceYears);
  const videoSrc = embedVideoSrc(tutor.introVideoUrl || tutor.videoUrl);
  const mapSrc = openStreetMapEmbed(place);
  const similar = await similarTutors({
    id: tutor.id,
    subjects: tutor.subjects,
    location: tutor.location,
    take: 4,
  });
  const modes = [tutor.online ? "Online" : null, tutor.inPerson ? "In person" : null].filter(
    Boolean,
  ) as string[];
  // Privacy: phone is only shown to the profile owner or admin, and only when the tutor is verified.
  // Personal email and external website links are NEVER shown on the public profile.
  // Raw academic certificates/documents are never displayed (they go through the admin verification flow only).
  const showPhone = Boolean(tutor.verified && tutor.phone && (isOwner || isAdmin || session?.user?.role === "STUDENT"));
  const canMessage = session?.user?.role === "STUDENT";
  const initial = tutor.user.name.slice(0, 1).toUpperCase();

  return (
    <div className="page">
      <div className="container stack">
        {!tutor.active && (isOwner || isAdmin) && (
          <p className="panel profile-notice">
            This listing is hidden from search until{" "}
            {isOwner ? (
              <>
                you activate <Link href="/pricing">Tutor Basic</Link>
              </>
            ) : (
              "Tutor Basic is active"
            )}
            .
          </p>
        )}
        {isOwner && (
          <p className="panel profile-notice">
            This is your public listing.{" "}
            <Link href="/dashboard">Edit profile</Link>
          </p>
        )}

        <div className="profile-layout">
          <div className="profile-main stack">
            <section className="panel profile-hero">
              <div className="profile-hero-top">
                <TutorAvatar
                  className="profile-photo"
                  photoUrl={tutor.photoUrl}
                  cropX={tutor.photoCropX}
                  cropY={tutor.photoCropY}
                  cropZoom={tutor.photoCropZoom}
                  initial={initial}
                />
                <div className="profile-hero-copy">
                  <div className="meta">
                    {highlighted && <span className="badge accent">Highlighted</span>}
                    {(tutor.planTier ?? 0) >= 2 && <span className="badge badge-featured">Featured</span>}
                    {tutor.verified && (
                      <span className="badge badge-verified">✓ Verified</span>
                    )}
                    {tutor.offersFreeTrial && <span className="badge">Free trial</span>}
                    {avg !== null && (
                      <span className="profile-rating">
                        {stars(avg)} {avg.toFixed(1)} · {tutor.reviews.length}{" "}
                        {tutor.reviews.length === 1 ? "review" : "reviews"}
                      </span>
                    )}
                  </div>
                  <h1 className="page-title">{tutor.user.name}</h1>
                  {tutor.headline && <p className="profile-headline">{tutor.headline}</p>}
                  <div className="profile-hero-facts">
                    <span className="price-tag">{formatHourly(tutor.hourlyRate, currency)}</span>
                    <span>{place}</span>
                    {modes.length > 0 && <span>{modes.join(" · ")}</span>}
                  </div>
                  {canMessage && (
                    <a className="btn btn-sm profile-hero-cta" href="#message-tutor">
                      Message {tutor.user.name.split(" ")[0]}
                    </a>
                  )}
                  {!session && (
                    <Link className="btn btn-sm profile-hero-cta" href="/register?role=student">
                      Join to message
                    </Link>
                  )}
                </div>
              </div>
              {subjects.length > 0 && (
                <div className="profile-chips">
                  {subjects.map((s) => (
                    <Link key={s} href={`/search?subject=${encodeURIComponent(s)}`} className="chip">
                      {s}
                    </Link>
                  ))}
                </div>
              )}
              {expertise.length > 0 && (
                <div className="profile-chips profile-expertise">
                  {expertise.map((skill) => (
                    <span key={skill} className="chip">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="panel profile-section">
              <h2>About</h2>
              <p className="prose-block">{tutor.bio}</p>
            </section>

            <section className="panel profile-section">
              <h2>Teaching details</h2>
              <dl className="profile-facts">
                {tutor.country && (
                  <div>
                    <dt>Country</dt>
                    <dd>{tutor.country}</dd>
                  </div>
                )}
                {levels.length > 0 && (
                  <div>
                    <dt>Levels</dt>
                    <dd>{levels.join(" · ")}</dd>
                  </div>
                )}
                {expertise.length > 0 && (
                  <div>
                    <dt>Expertise</dt>
                    <dd>{expertise.join(" · ")}</dd>
                  </div>
                )}
                {languages.length > 0 && (
                  <div>
                    <dt>Languages</dt>
                    <dd>{languages.join(" · ")}</dd>
                  </div>
                )}
                {tutor.qualifications && (
                  <div>
                    <dt>Qualifications</dt>
                    <dd className="prose-block">{tutor.qualifications}</dd>
                  </div>
                )}
                {experienceLabel && (
                  <div>
                    <dt>Experience</dt>
                    <dd>{experienceLabel}</dd>
                  </div>
                )}
                {tutor.teachingMethod && (
                  <div>
                    <dt>How lessons work</dt>
                    <dd className="prose-block">{tutor.teachingMethod}</dd>
                  </div>
                )}
                {availabilityLines.length > 0 && (
                  <div>
                    <dt>Availability</dt>
                    <dd>
                      <ul className="schedule-public">
                        {availabilityLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
              {!tutor.qualifications && !tutor.teachingMethod && !availabilityLines.length && !experienceLabel && levels.length === 0 && languages.length === 0 && expertise.length === 0 && !tutor.country && (
                <p className="muted">This tutor has not added extra teaching details yet.</p>
              )}
            </section>

            {tutor.ads.length > 0 && (
              <section className="panel profile-section">
                <h2>Subject ads</h2>
                <div className="profile-ads">
                  {tutor.ads.map((ad) => (
                    <article key={ad.id} className="profile-ad">
                      <h3>{ad.title}</h3>
                      <p className="muted">
                        {ad.subject} · {ad.level} · {formatHourly(ad.rate, currency)}
                      </p>
                      {ad.description && <p>{ad.description}</p>}
                      <Link href={`/s/${slugify(ad.subject)}`} className="muted">
                        More {ad.subject} tutors
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {videoSrc && (
              <section className="panel profile-section">
                <h2>Intro video</h2>
                <div className="media-embed-wrap">
                  <iframe
                    className="media-embed"
                    title={`Intro video from ${tutor.user.name}`}
                    src={videoSrc}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </section>
            )}
            {(tutor.introVideoUrl || tutor.videoUrl) && !videoSrc && (
              <section className="panel profile-section">
                <h2>Intro video</h2>
                <p>
                  <a href={tutor.introVideoUrl || tutor.videoUrl!} target="_blank" rel="noreferrer">
                    Watch intro video
                  </a>
                </p>
              </section>
            )}

            {mapSrc && (
              <section className="panel profile-section">
                <h2>Area</h2>
                <p className="muted" style={{ marginTop: 0 }}>
                  City map for this listing — not live GPS tracking.
                </p>
                <iframe
                  className="media-embed map-embed"
                  title={`Map of ${tutor.location}`}
                  src={mapSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <p className="muted">
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(tutor.location.replace(/online/gi, "").trim() || tutor.location)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in OpenStreetMap
                  </a>
                </p>
              </section>
            )}

            <section className="panel profile-section" id="reviews">
              <h2>Reviews</h2>
              {avg !== null && (
                <p className="profile-rating" style={{ marginTop: 0 }}>
                  {stars(avg)} {avg.toFixed(1)} from {tutor.reviews.length}{" "}
                  {tutor.reviews.length === 1 ? "review" : "reviews"}
                </p>
              )}
              {tutor.reviews.length === 0 && <p className="muted">No published reviews yet.</p>}
              <div className="profile-reviews">
                {tutor.reviews.map((r) => (
                  <article key={r.id} className="profile-review">
                    <p className="profile-rating">{stars(r.rating)}</p>
                    <strong>{r.student.name}</strong>
                    <p>{r.comment}</p>
                  </article>
                ))}
              </div>
              {session?.user?.role === "STUDENT" && <ReviewForm tutorProfileId={tutor.id} />}
            </section>
          </div>

          <aside className="profile-aside stack">
            <section className="panel profile-book" id="message-tutor">
              <p className="eyebrow">Lesson rate</p>
              <p className="profile-book-price">{formatHourly(tutor.hourlyRate, currency)}</p>
              <p className="muted">
                {tutor.location}
                {modes.length ? ` · ${modes.join(" · ")}` : ""}
              </p>
              {showPhone && <p>Phone: {tutor.phone}</p>}
              {canMessage ? (
                <ContactTutorForm recipientId={tutor.user.id} tutorName={tutor.user.name} />
              ) : isOwner ? (
                <p className="muted">Students with a Pass can message you from this page.</p>
              ) : !session ? (
                <div className="profile-book-cta">
                  <p className="muted">Create a student account and subscribe to message this tutor.</p>
                  <Link href="/register?role=student" className="btn btn-block">
                    Join as student
                  </Link>
                  <p className="muted">
                    Already registered? <Link href="/login">Sign in</Link>
                  </p>
                </div>
              ) : (
                <p className="muted">Switch to a student account with a Student Pass to send a message.</p>
              )}
              <p className="muted profile-fee-note">
                Lesson fees are arranged directly with {tutor.user.name}. My Tutoring Hub does not
                process lesson payments.
              </p>
            </section>
            {session?.user && (
              <div className="panel">
                <ReportButton targetType="TUTOR" targetId={tutor.id} />
              </div>
            )}
          </aside>
        </div>

        {similar.length > 0 && (
          <section>
            <h2 className="page-title" style={{ fontSize: "1.45rem" }}>
              Similar tutors
            </h2>
            <p className="muted">More tutors in the same subject or city.</p>
            <div className="tutor-grid similar-tutors">
              {similar.map((t) => (
                <Link key={t.id} href={`/tutors/${t.id}`} className="tutor-card">
                  <TutorAvatar
                    className="tutor-avatar"
                    photoUrl={t.photoUrl}
                    cropX={t.photoCropX}
                    cropY={t.photoCropY}
                    cropZoom={t.photoCropZoom}
                    initial={t.user.name.slice(0, 1)}
                  />
                  <div className="tutor-card-body">
                    <div className="meta">
                      {t.verified && <span className="badge">Verified</span>}
                    </div>
                    <h3>{t.user.name}</h3>
                    <p className="tutor-headline">{t.headline || t.subjects}</p>
                    <div className="meta">
                      <strong className="price-tag">{formatHourly(t.hourlyRate, currency)}</strong>
                      <span>{formatTutorPlace(t.location, t.country) || "Online"}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
