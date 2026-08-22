import { notFound } from "next/navigation";
import { TutorAvatar } from "@/components/TutorAvatar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactTutorForm } from "@/components/ContactTutorForm";
import { ShareTutorButton } from "@/components/ShareTutorButton";
import { ReviewForm } from "@/components/ReviewForm";
import { TutorTrustBadgePill } from "@/components/TutorTrustBadgePill";
import {
  publicTutorBio,
  TUTOR_VERIFY_PROFILE_MESSAGE,
} from "@/lib/tutor-listing-copy";
import { ReportButton } from "@/components/ReportButton";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { similarTutors, slugify } from "@/lib/search-tutors";
import { embedVideoSrc } from "@/lib/media";
import { formatTutorPlace } from "@/lib/tutor-catalog";
import {
  formatAvailabilityLines,
  formatExperienceYears,
  groupAvailabilityByDay,
  WEEKDAYS,
} from "@/lib/availability";
import Link from "next/link";
import type { Session } from "next-auth";
import { JsonLd } from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  pageMetadata,
  truncateDescription,
  tutorProfileJsonLd,
} from "@/lib/seo";

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

function formatReviewDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", year: "numeric", day: "numeric" });
}

function isProfileIncomplete(tutor: {
  photoUrl?: string | null;
  bio: string;
  subjects: string;
}) {
  const hasPhoto = Boolean(tutor.photoUrl?.startsWith("http"));
  const hasBio = tutor.bio.trim().length >= 40;
  const hasSubjects = splitList(tutor.subjects).length > 0;
  return !hasPhoto || !hasBio || !hasSubjects;
}

function ProfileCtaButtons({
  tutorId,
  tutorFirstName,
  canMessage,
  session,
}: {
  tutorId: string;
  tutorFirstName: string;
  canMessage: boolean;
  session: Session | null;
}) {
  if (canMessage) {
    return (
      <div className="profile-cta-stack">
        <a className="btn btn-block" href="#message-tutor">
          Message Tutor
        </a>
        <a className="btn btn-secondary btn-block" href="#message-tutor">
          Request a Lesson
        </a>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="profile-cta-stack">
        <Link className="btn btn-block" href="/register?role=student">
          Join to message
        </Link>
        <Link className="btn btn-secondary btn-block" href="/register?role=student">
          Request a Lesson
        </Link>
      </div>
    );
  }
  return (
    <div className="profile-cta-stack">
      <Link className="btn btn-block" href={`/tutors/${tutorId}#message-tutor`}>
        View contact options
      </Link>
      <p className="muted profile-cta-hint">
        Switch to a student account with a Student Pass to message {tutorFirstName}.
      </p>
    </div>
  );
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!tutor) return { title: "Tutor not found" };
  const place = formatTutorPlace(tutor.location, tutor.country);
  const primarySubject = splitList(tutor.subjects)[0] || "Private";
  const description =
    tutor.headline ||
    `${tutor.user.name} teaches ${tutor.subjects} in ${place}. Read reviews, compare rates, and message on My Tutoring Hub.`;
  return pageMetadata({
    title: `${tutor.user.name} – ${primarySubject} Tutor${place ? ` in ${place}` : ""}`,
    description: truncateDescription(description),
    path: `/tutors/${id}`,
    noIndex: !tutor.active,
    ogType: "profile",
  });
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
      recommendations: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      ads: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!tutor) notFound();

  const viewerId = session?.user?.id;
  const isOwner = Boolean(viewerId && viewerId === tutor.userId);
  const isAdmin = session?.user?.role === "ADMIN";
  if (!tutor.active && !isOwner && !isAdmin) notFound();

  // Fire-and-forget profile view (skip owner views; ignore missing table)
  if (!isOwner) {
    void prisma.profileView
      .create({ data: { tutorId: tutor.id } })
      .catch(() => undefined);
  }

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
  const { slots: availabilitySlots, grouped: availabilityByDay } = groupAvailabilityByDay(
    tutor.availability,
  );
  const availabilityLines = formatAvailabilityLines(tutor.availability);
  const experienceLabel = formatExperienceYears(tutor.experienceYears);
  const videoSrc = embedVideoSrc(tutor.introVideoUrl || tutor.videoUrl);
  const similar = await similarTutors({
    id: tutor.id,
    subjects: tutor.subjects,
    location: tutor.location,
    take: 4,
  });
  const modes = [tutor.online ? "Online" : null, tutor.inPerson ? "In person" : null].filter(
    Boolean,
  ) as string[];
  let hasConversation = false;
  if (viewerId && !isOwner && !isAdmin) {
    const talked = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userAId: viewerId, userBId: tutor.userId },
          { userAId: tutor.userId, userBId: viewerId },
        ],
      },
      select: { id: true },
    });
    hasConversation = Boolean(talked);
  }
  const showPhone = Boolean(
    tutor.verified && tutor.phone && (isOwner || isAdmin || hasConversation),
  );
  const canMessage = session?.user?.role === "STUDENT";
  const viewer =
    canMessage && session?.user
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { emailVerified: true, email: true },
        })
      : null;
  const viewerEmailVerified = Boolean(viewer?.emailVerified);
  const initial = tutor.user.name.slice(0, 1).toUpperCase();
  const firstName = tutor.user.name.split(" ")[0];
  const profileIncomplete = isOwner && isProfileIncomplete(tutor);
  const hasStructuredAvailability = availabilitySlots.length > 0;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Find tutors", path: "/search" },
              { name: tutor.user.name, path: `/tutors/${tutor.id}` },
            ]),
            tutorProfileJsonLd({
              id: tutor.id,
              name: tutor.user.name,
              description: tutor.headline || tutor.bio,
              subjects: tutor.subjects,
              location: place,
              hourlyRatePkr: tutor.hourlyRate,
              currency,
              hourlyLabel: formatHourly(tutor.hourlyRate, currency),
              photoUrl: tutor.photoUrl,
              rating: avg,
              reviewCount: tutor.reviews.length,
              verified: tutor.verified,
            }),
          ],
        }}
      />
    <div className="page profile-page">
      <div className="container profile-shell">
        {!tutor.active && (isOwner || isAdmin) && (
          <p className="panel profile-notice">
            This listing is hidden from search until{" "}
            {isOwner ? (
              <>
                you add subjects and a headline (or photo) on your{" "}
                <Link href="/dashboard">dashboard</Link>. Tutor Basic adds priority ranking, not
                basic visibility.
              </>
            ) : (
              "the profile is complete enough to list"
            )}
            .
          </p>
        )}

        {profileIncomplete && (
          <div className="profile-complete-banner">
            <strong>Complete your profile to get more student enquiries</strong>
            <p className="muted">
              Add a photo, introduction, and subjects so students can find and trust your listing.
            </p>
            <Link href="/dashboard" className="btn btn-sm">
              Complete profile
            </Link>
          </div>
        )}

        {isOwner && !profileIncomplete && (
          <p className="panel profile-notice">
            This is your public listing.{" "}
            <Link href="/dashboard">Edit profile</Link>
          </p>
        )}

        <div className="profile-v2-layout">
          <aside className="profile-sidebar">
            <div className="profile-sidebar-card">
              <TutorAvatar
                className="profile-photo-lg"
                photoUrl={tutor.photoUrl}
                cropX={tutor.photoCropX}
                cropY={tutor.photoCropY}
                cropZoom={tutor.photoCropZoom}
                initial={initial}
              />

              <h1 className="profile-name">{tutor.user.name}</h1>
              {tutor.headline ? (
                <p className="profile-headline-v2">{tutor.headline}</p>
              ) : (
                isOwner && <p className="profile-headline-v2 profile-placeholder">Add a headline</p>
              )}

              <div className="profile-badges-row">
                {isOwner ? (
                  tutor.verified ? (
                    <span className="badge badge-verified">✓ Verified</span>
                  ) : (
                    <span className="badge tutor-owner-verify-badge">Not Verified</span>
                  )
                ) : (
                  <>
                    <TutorTrustBadgePill badge={tutor.trustBadge || "NEW"} fullLabel />
                    {tutor.verified && <span className="badge badge-verified">✓ Verified</span>}
                  </>
                )}
                {highlighted && <span className="badge accent">Featured</span>}
                {tutor.offersFreeTrial && <span className="badge">Free trial</span>}
              </div>

              {isOwner && !tutor.verified && (
                <p className="profile-owner-verify-hint muted">{TUTOR_VERIFY_PROFILE_MESSAGE}</p>
              )}

              {avg !== null ? (
                <p className="profile-rating-block">
                  <span className="profile-rating">{stars(avg)}</span>
                  <span>
                    <strong>{avg.toFixed(1)}</strong>
                    <span className="muted">
                      {" "}
                      · {tutor.reviews.length} {tutor.reviews.length === 1 ? "review" : "reviews"}
                    </span>
                  </span>
                </p>
              ) : (
                <p className="muted profile-rating-empty">No reviews yet</p>
              )}

              <p className="profile-rate-lg">{formatHourly(tutor.hourlyRate, currency)}</p>
              <p className="profile-rate-label muted">per hour</p>

              <ul className="profile-facts-list">
                {experienceLabel && <li>{experienceLabel} teaching experience</li>}
                {place && <li>{place}</li>}
                {modes.length > 0 && <li>{modes.join(" · ")}</li>}
                {tutor.country && place !== tutor.country && <li>{tutor.country}</li>}
              </ul>

              <ProfileCtaButtons
                tutorId={tutor.id}
                tutorFirstName={firstName}
                canMessage={canMessage}
                session={session}
              />

              <div className="profile-share-row">
                <ShareTutorButton tutorId={tutor.id} tutorName={tutor.user.name?.trim() || "Tutor"} />
              </div>

              <dl className="profile-quick-stats">
                {subjects.length > 0 && (
                  <div>
                    <dt>{subjects.length}</dt>
                    <dd>{subjects.length === 1 ? "Subject" : "Subjects"}</dd>
                  </div>
                )}
                {languages.length > 0 && (
                  <div>
                    <dt>{languages.length}</dt>
                    <dd>{languages.length === 1 ? "Language" : "Languages"}</dd>
                  </div>
                )}
                {tutor.reviews.length > 0 && (
                  <div>
                    <dt>{tutor.reviews.length}</dt>
                    <dd>{tutor.reviews.length === 1 ? "Review" : "Reviews"}</dd>
                  </div>
                )}
              </dl>
            </div>

            {session?.user && (
              <div className="panel profile-sidebar-extra">
                <ReportButton targetType="TUTOR" targetId={tutor.id} />
              </div>
            )}
          </aside>

          <div className="profile-content stack">
            {videoSrc && (
              <section className="profile-content-card">
                <h2>Introduction video</h2>
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
              <section className="profile-content-card">
                <h2>Introduction video</h2>
                {isOwner ? (
                  <p className="profile-placeholder">
                    Your video link could not be embedded. Check the URL in your dashboard.
                  </p>
                ) : (
                  <p className="muted">This tutor has shared an intro video on their listing.</p>
                )}
              </section>
            )}

            <section className="profile-content-card">
              <h2>About</h2>
              {publicTutorBio(tutor.bio, isOwner) ? (
                <p className="prose-block profile-bio">{publicTutorBio(tutor.bio, isOwner)}</p>
              ) : isOwner ? (
                <p className="profile-placeholder">
                  Tell students about your teaching style and experience — profiles with a strong
                  introduction get more enquiries.
                </p>
              ) : (
                <p className="muted">This tutor has not added an introduction yet.</p>
              )}
              {tutor.teachingMethod && (
                <>
                  <h3 className="profile-subheading">How lessons work</h3>
                  <p className="prose-block profile-bio">{tutor.teachingMethod}</p>
                </>
              )}
            </section>

            {(subjects.length > 0 || levels.length > 0 || expertise.length > 0) && (
              <section className="profile-content-card">
                <h2>Subjects &amp; levels</h2>
                {subjects.length > 0 && (
                  <div className="profile-chip-group">
                    <p className="profile-chip-label">Subjects</p>
                    <div className="profile-chips-row">
                      {subjects.map((s) => (
                        <Link
                          key={s}
                          href={`/search?subject=${encodeURIComponent(s)}`}
                          className="profile-chip profile-chip-subject"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {levels.length > 0 && (
                  <div className="profile-chip-group">
                    <p className="profile-chip-label">Levels</p>
                    <div className="profile-chips-row">
                      {levels.map((level) => (
                        <span key={level} className="profile-chip profile-chip-level">
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {expertise.length > 0 && (
                  <div className="profile-chip-group">
                    <p className="profile-chip-label">Boards &amp; curricula</p>
                    <div className="profile-chips-row">
                      {expertise.map((board) => (
                        <span key={board} className="profile-chip profile-chip-board">
                          {board}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {languages.length > 0 && (
                  <div className="profile-chip-group">
                    <p className="profile-chip-label">Languages</p>
                    <div className="profile-chips-row">
                      {languages.map((lang) => (
                        <span key={lang} className="profile-chip profile-chip-board">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="profile-content-card">
              <h2>Availability</h2>
              {hasStructuredAvailability ? (
                <div className="profile-schedule-grid">
                  {WEEKDAYS.map((day) => {
                    const daySlots = availabilityByDay.get(day) ?? [];
                    return (
                      <div
                        key={day}
                        className={`profile-schedule-day${daySlots.length ? " is-available" : ""}`}
                      >
                        <p className="profile-schedule-day-name">{day.slice(0, 3)}</p>
                        {daySlots.length > 0 ? (
                          <ul className="profile-schedule-times">
                            {daySlots.map((slot) => (
                              <li key={`${slot.day}-${slot.start}-${slot.end}`}>
                                {slot.start}–{slot.end}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted profile-schedule-off">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : availabilityLines.length > 0 ? (
                <ul className="schedule-public">
                  {availabilityLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : isOwner ? (
                <p className="profile-placeholder">
                  Add your weekly availability so students know when you can teach.
                </p>
              ) : (
                <p className="muted">Contact this tutor to discuss lesson times.</p>
              )}
            </section>

            {tutor.ads.length > 0 && (
              <section className="profile-content-card">
                <h2>Subject listings</h2>
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

            <section className="profile-content-card" id="recommendations">
              <h2>Recommendations</h2>
              {tutor.recommendations.length === 0 ? (
                <p className="muted">
                  {isOwner
                    ? "Submit off-platform recommendations from your dashboard. We verify each one before it appears here."
                    : "No verified recommendations yet."}
                </p>
              ) : (
                <div className="profile-reviews-v2">
                  {tutor.recommendations.map((rec) => (
                    <article key={rec.id} className="profile-review-card">
                      <strong>{rec.recommenderName}</strong>
                      {rec.relationship && <p className="muted">{rec.relationship}</p>}
                      <p>{rec.comment}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="profile-content-card" id="reviews">
              <h2>Student reviews</h2>
              {avg !== null && (
                <p className="profile-rating-block" style={{ marginTop: 0 }}>
                  <span className="profile-rating">{stars(avg)}</span>
                  <span>
                    <strong>{avg.toFixed(1)}</strong>
                    <span className="muted">
                      {" "}
                      from {tutor.reviews.length}{" "}
                      {tutor.reviews.length === 1 ? "review" : "reviews"}
                    </span>
                  </span>
                </p>
              )}
              {tutor.reviews.length === 0 && (
                <p className="muted">
                  {isOwner
                    ? "Reviews appear here after students rate their lessons with you."
                    : "No reviews yet — be the first to leave feedback after a lesson."}
                </p>
              )}
              <div className="profile-reviews-v2">
                {tutor.reviews.map((r) => (
                  <article key={r.id} className="profile-review-card">
                    <div className="profile-review-head">
                      <p className="profile-rating">{stars(r.rating)}</p>
                      <time className="muted" dateTime={r.createdAt.toISOString()}>
                        {formatReviewDate(r.createdAt)}
                      </time>
                    </div>
                    <strong>{r.student.name}</strong>
                    <p>{r.comment}</p>
                  </article>
                ))}
              </div>
              {session?.user?.role === "STUDENT" && <ReviewForm tutorProfileId={tutor.id} />}
            </section>

            <section className="profile-content-card profile-contact-card" id="message-tutor">
              <h2>Contact {firstName}</h2>
              <p className="profile-rate-lg profile-rate-inline">
                {formatHourly(tutor.hourlyRate, currency)}
                <span className="profile-rate-label muted"> per hour</span>
              </p>
              <p className="muted">
                {place}
                {modes.length ? ` · ${modes.join(" · ")}` : ""}
              </p>
              {showPhone ? (
                <p>Phone: {tutor.phone}</p>
              ) : (
                canMessage &&
                tutor.verified &&
                tutor.phone && (
                  <p className="muted">Phone is shared after you message each other. Use Message below.</p>
                )
              )}
              {canMessage ? (
                <ContactTutorForm
                  recipientId={tutor.user.id}
                  tutorName={tutor.user.name}
                  emailVerified={viewerEmailVerified}
                  viewerEmail={viewer?.email ?? session?.user?.email}
                />
              ) : isOwner ? (
                <p className="muted">Students can message you from this page (3 free contacts/month, or unlimited with Student Pass).</p>
              ) : !session ? (
                <div className="profile-book-cta">
                  <p className="muted">
                    Create a free student account to message this tutor (3 contacts/month included).
                  </p>
                  <Link href="/register?role=student" className="btn btn-block">
                    Join as student
                  </Link>
                  <p className="muted">
                    Already registered? <Link href="/login">Sign in</Link>
                  </p>
                </div>
              ) : (
                <p className="muted">
                  Switch to a student account to send a message. Free accounts get 3 contacts/month;
                  Student Pass unlocks unlimited messaging.
                </p>
              )}
              <p className="muted profile-fee-note">
                Lesson fees are arranged directly with {tutor.user.name}. My Tutoring Hub does not
                process lesson payments.
              </p>
            </section>
          </div>
        </div>

        {similar.length > 0 && (
          <section className="profile-similar">
            <h2 className="profile-section-title">Similar tutors</h2>
            <p className="muted">More tutors in the same subject or city.</p>
            <div className="tutor-grid similar-tutors">
              {similar.map((t) => {
                const tAvg =
                  t.reviews.length > 0
                    ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                    : null;
                const tSubjects = splitList(t.subjects).slice(0, 3);
                return (
                  <div key={t.id} className="tc-card">
                    <div className="tc-left">
                      <TutorAvatar
                        className="tc-avatar"
                        photoUrl={t.photoUrl}
                        cropX={t.photoCropX}
                        cropY={t.photoCropY}
                        cropZoom={t.photoCropZoom}
                        initial={t.user.name.slice(0, 1).toUpperCase()}
                      />
                      <TutorTrustBadgePill badge={t.trustBadge} size="sm" />
                    </div>
                    <div className="tc-body">
                      <div className="tc-top-row">
                        <div className="tc-name-area">
                          <h3 className="tc-name">
                            <Link href={`/tutors/${t.id}`}>{t.user.name}</Link>
                          </h3>
                          <p className="tc-headline">{t.headline || t.subjects}</p>
                        </div>
                        <div className="tc-price-area">
                          <span className="tc-rate">{formatHourly(t.hourlyRate, currency)}</span>
                          <span className="tc-rate-label">/ hour</span>
                        </div>
                      </div>
                      <div className="tc-badges">
                        {t.verified && <span className="badge badge-verified">✓ Verified</span>}
                        {tAvg !== null && (
                          <span className="tc-rating">
                            {"★".repeat(Math.round(tAvg))}
                            {"☆".repeat(5 - Math.round(tAvg))}{" "}
                            <strong>{tAvg.toFixed(1)}</strong>
                          </span>
                        )}
                      </div>
                      {tSubjects.length > 0 && (
                        <div className="tc-chips">
                          {tSubjects.map((s) => (
                            <span key={s} className="tc-chip">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="tc-footer">
                        <span className="tc-place muted">
                          {formatTutorPlace(t.location, t.country) || "Online"}
                        </span>
                        <div className="tc-actions">
                          <Link href={`/tutors/${t.id}`} className="btn btn-sm">
                            View profile
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="profile-mobile-bar" aria-label="Contact tutor">
        {canMessage ? (
          <>
            <a className="btn btn-block" href="#message-tutor">
              Message
            </a>
            <a className="btn btn-secondary btn-block" href="#message-tutor">
              Request
            </a>
          </>
        ) : !session ? (
          <>
            <Link className="btn btn-block" href="/register?role=student">
              Join to message
            </Link>
            <Link className="btn btn-secondary btn-block" href="/register?role=student">
              Request
            </Link>
          </>
        ) : (
          <a className="btn btn-block" href="#message-tutor">
            Contact options
          </a>
        )}
      </div>
    </div>
    </>
  );
}
