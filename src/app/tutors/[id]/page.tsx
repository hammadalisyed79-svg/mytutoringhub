import { notFound } from "next/navigation";
import { TutorAvatar } from "@/components/TutorAvatar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaveTutorButton } from "@/components/SaveTutorButton";
import { TrackTutorView } from "@/components/RecentAndSavedTutors";
import { ContactTutorForm } from "@/components/ContactTutorForm";
import { ShareTutorButton } from "@/components/ShareTutorButton";
import { ReviewForm } from "@/components/ReviewForm";
import { TutorTrustBadgePill } from "@/components/TutorTrustBadgePill";
import {
  publicTutorBio,
  TUTOR_VERIFY_PROFILE_MESSAGE,
} from "@/lib/tutor-listing-copy";
import {
  computeTutorTrustBadge,
  getTutorBadgeStats,
  getTrustBadgesForProfiles,
} from "@/lib/tutor-badges";
import { ReportButton, BlockUserButton } from "@/components/ReportButton";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { listingPath } from "@/lib/subject-profile";
import { similarTutors, slugify } from "@/lib/search-tutors";
import { embedVideoSrc } from "@/lib/media";
import { formatTutorPlace, formatTutorAvailability } from "@/lib/tutor-catalog";
import { canViewTutorProfilePublicly, tutorPublicVisibilityInput } from "@/lib/tutor-public-eligibility";
import { studentFreeContactsShort } from "@/lib/marketing-copy";
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
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";

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

function isProfileIncomplete(
  tutor: {
    photoUrl?: string | null;
    headline?: string | null;
    bio: string;
    subjects: string;
    country?: string | null;
    location: string;
    hourlyRate: number;
    online: boolean;
    inPerson: boolean;
    qualifications?: string | null;
    subjectProfiles?: Array<{
      status?: string | null;
      subject?: string | null;
      rate?: number | null;
      online?: boolean | null;
      inPerson?: boolean | null;
    }> | null;
  },
  name: string,
) {
  return !getTutorProfileCompletion({
    name,
    photoUrl: tutor.photoUrl,
    headline: tutor.headline,
    bio: tutor.bio,
    country: tutor.country,
    location: tutor.location,
    subjects: tutor.subjects,
    hourlyRate: tutor.hourlyRate,
    online: tutor.online,
    inPerson: tutor.inPerson,
    qualifications: tutor.qualifications,
    subjectProfiles: tutor.subjectProfiles,
  }).complete;
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
          Ask about availability
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
        <Link className="btn btn-secondary btn-block" href={`/login?next=${encodeURIComponent(`/tutors/${tutorId}`)}`}>
          Sign in
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
  const session = await auth();
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, emailVerified: true, suspended: true } },
      subjectProfiles: {
        where: { status: "ACTIVE" },
        select: { id: true, status: true, subject: true, rate: true, online: true, inPerson: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      },
    },
  });
  if (!tutor) {
    return pageMetadata({
      title: "Tutor not found",
      description: "This tutor listing is not available on My Tutoring Hub.",
      path: `/tutors/${id}`,
      noIndex: true,
    });
  }

  const isOwner = session?.user?.id === tutor.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isPublic = canViewTutorProfilePublicly(tutorPublicVisibilityInput(tutor));

  if (!isPublic && !isOwner && !isAdmin) {
    return pageMetadata({
      title: "Tutor not found",
      description: "This tutor listing is not available on My Tutoring Hub.",
      path: `/tutors/${id}`,
      noIndex: true,
    });
  }

  if (isOwner && !isPublic) {
    return pageMetadata({
      title: `${tutor.user.name} – profile preview`,
      description: "Your tutor listing preview on My Tutoring Hub. Complete your profile to go live in search.",
      path: `/tutors/${id}`,
      noIndex: true,
    });
  }

  const place = formatTutorPlace(tutor.location, tutor.country);
  const primarySubject = splitList(tutor.subjects)[0] || "Private";
  const description =
    tutor.headline ||
    `${tutor.user.name} teaches ${tutor.subjects} in ${place}. Read reviews, compare rates, and message on My Tutoring Hub.`;
  // Single-listing tutors: canonicalize to /listings so person hub does not compete for the subject query.
  const soleListingId =
    tutor.subjectProfiles.length === 1 ? tutor.subjectProfiles[0]?.id : null;
  return pageMetadata({
    title: `${tutor.user.name} – ${primarySubject} Tutor${place ? ` in ${place}` : ""}`,
    description: truncateDescription(description),
    path: `/tutors/${id}`,
    canonicalPath: soleListingId ? listingPath(soleListingId) : undefined,
    noIndex: false,
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
      user: { select: { id: true, name: true, emailVerified: true, suspended: true } },
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: { student: { select: { name: true } } },
      },
      ads: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
      subjectProfiles: { where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!tutor) notFound();

  const [badgeStats, approvedRecommendations] = await Promise.all([
    getTutorBadgeStats(tutor.id),
    prisma.tutorRecommendation
      .findMany({
        where: { tutorProfileId: tutor.id, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 12,
      })
      .catch(() => []),
  ]);
  const tutorTrustBadge = computeTutorTrustBadge(badgeStats);

  const viewerId = session?.user?.id;
  const isOwner = Boolean(viewerId && viewerId === tutor.userId);
  const isAdmin = session?.user?.role === "ADMIN";
  if (!isOwner && !isAdmin && !canViewTutorProfilePublicly(tutorPublicVisibilityInput(tutor))) {
    notFound();
  }

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
  const availability = formatTutorAvailability({
    location: tutor.location,
    country: tutor.country,
    online: tutor.online,
    inPerson: tutor.inPerson,
  });
  const { slots: availabilitySlots, grouped: availabilityByDay } = groupAvailabilityByDay(
    tutor.availability,
  );
  const availabilityLines = formatAvailabilityLines(tutor.availability);
  const experienceLabel = formatExperienceYears(tutor.experienceYears);
  const videoSrc = embedVideoSrc(tutor.introVideoUrl || tutor.videoUrl);
  const similar = await similarTutors({
    excludeTutorProfileId: tutor.id,
    subjects: tutor.subjects,
    location: tutor.location,
    take: 4,
  });
  const similarBadges = await getTrustBadgesForProfiles(similar.map((t) => t.tutorProfileId));
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
  const profileIncomplete = isOwner && isProfileIncomplete(tutor, tutor.user.name);
  const hasStructuredAvailability = availabilitySlots.length > 0;
  const listingRates = tutor.subjectProfiles.map((l) => l.rate).filter((r) => Number.isFinite(r));
  const fromRate =
    listingRates.length > 0 ? Math.min(...listingRates) : tutor.hourlyRate;
  const showFromRate = listingRates.length > 1;

  return (
    <>
      <TrackTutorView
        tutor={{
          tutorProfileId: tutor.id,
          name: tutor.user.name,
          subject: splitList(tutor.subjects)[0],
          photoUrl: tutor.photoUrl,
          href: `/tutors/${tutor.id}`,
        }}
      />
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
                <Link href="/dashboard">dashboard</Link>. Tutor Pro adds priority ranking, not
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
                priority
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
                    <TutorTrustBadgePill badge={tutorTrustBadge} fullLabel />
                    {tutor.verified && <span className="badge badge-verified">✓ Verified</span>}
                  </>
                )}
                {highlighted && <span className="badge accent">Featured</span>}
                {tutor.offersFreeTrial && <span className="badge">Free trial</span>}
                {!isOwner && (
                  <SaveTutorButton
                    tutor={{
                      tutorProfileId: tutor.id,
                      name: tutor.user.name,
                      subject: splitList(tutor.subjects)[0],
                      photoUrl: tutor.photoUrl,
                      href: `/tutors/${tutor.id}`,
                    }}
                  />
                )}
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

              <p className="profile-rate-lg">
                {showFromRate ? "From " : ""}
                {formatHourly(fromRate, currency)}
              </p>

              <ul className="profile-facts-list">
                {experienceLabel && <li>{experienceLabel} teaching experience</li>}
                {availability && <li>{availability}</li>}
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
              <div className="panel profile-sidebar-extra stack">
                <ReportButton targetType="TUTOR" targetId={tutor.id} />
                {session.user.id !== tutor.userId && (
                  <BlockUserButton userId={tutor.userId} userName={tutor.user.name} />
                )}
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

            {tutor.subjectProfiles.length > 0 && (
              <section className="profile-content-card" id="lessons-offered">
                <h2>Lessons offered</h2>
                <p className="muted" style={{ marginTop: 0 }}>
                  Teaching Profiles from this tutor. Rates apply to each subject.
                </p>
                <div className="lessons-offered">
                  {tutor.subjectProfiles.map((listing) => {
                    const modes = [
                      listing.online ? "Online" : null,
                      listing.inPerson ? "In person" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const taxonomy = [
                      listing.board,
                      listing.qualification || (listing.level !== "All levels" ? listing.level : null),
                      listing.syllabusCode,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <article key={listing.id} className="lesson-offer-card">
                        <div className="lesson-offer-main">
                          <h3>
                            <Link href={listingPath(listing.id)}>{listing.title}</Link>
                          </h3>
                          <p className="muted lesson-offer-meta">
                            {listing.subject}
                            {taxonomy ? ` · ${taxonomy}` : ""}
                            {modes ? ` · ${modes}` : ""}
                          </p>
                          {listing.description && (
                            <p className="lesson-offer-desc">{listing.description.slice(0, 160)}</p>
                          )}
                        </div>
                        <div className="lesson-offer-aside">
                          <p className="lesson-offer-rate">{formatHourly(listing.rate, currency)}</p>
                          <div className="lesson-offer-actions">
                            <Link className="btn btn-sm" href={listingPath(listing.id)}>
                              View details
                            </Link>
                            {canMessage && (
                              <a className="btn btn-secondary btn-sm" href="#message-tutor">
                                Message
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {tutor.subjectProfiles.length === 0 && tutor.ads.length > 0 && (
              <section className="profile-content-card" id="lessons-offered">
                <h2>Lessons offered</h2>
                <div className="lessons-offered">
                  {tutor.ads.map((ad) => (
                    <article key={ad.id} className="lesson-offer-card">
                      <div className="lesson-offer-main">
                        <h3>{ad.title}</h3>
                        <p className="muted lesson-offer-meta">
                          {ad.subject} · {ad.level}
                        </p>
                        {ad.description && <p className="lesson-offer-desc">{ad.description}</p>}
                      </div>
                      <div className="lesson-offer-aside">
                        <p className="lesson-offer-rate">{formatHourly(tutor.hourlyRate, currency)}</p>
                        <Link href={`/s/${slugify(ad.subject)}`} className="btn btn-secondary btn-sm">
                          More {ad.subject} tutors
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="profile-content-card" id="recommendations">
              <h2>Recommendations</h2>
              {approvedRecommendations.length === 0 ? (
                <p className="muted">
                  {isOwner
                    ? "Submit off-platform recommendations from your dashboard. We verify each one before it appears here."
                    : "No verified recommendations yet."}
                </p>
              ) : (
                <div className="profile-reviews-v2">
                  {approvedRecommendations.map((rec) => (
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
                {showFromRate ? "From " : ""}
                {formatHourly(fromRate, currency)}
              </p>
              <p className="muted">{availability}</p>
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
                  listings={tutor.subjectProfiles.map((listing) => ({
                    id: listing.id,
                    title: listing.title,
                    subject: listing.subject,
                    rateLabel: formatHourly(listing.rate, currency),
                  }))}
                  subjectProfileId={tutor.subjectProfiles[0]?.id}
                />
              ) : isOwner ? (
                <p className="muted">Students can message you from this page ({studentFreeContactsShort()} free, or unlimited with Student Pass).</p>
              ) : !session ? (
                <div className="profile-book-cta">
                  <p className="muted">
                    Create a free student account to message this tutor ({studentFreeContactsShort()} included).
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
                  Switch to a student account to send a message. Free accounts get {studentFreeContactsShort()};
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
                      <TutorTrustBadgePill
                        badge={similarBadges.get(t.tutorProfileId) ?? "NEW"}
                        size="sm"
                      />
                    </div>
                    <div className="tc-body">
                      <div className="tc-top-row">
                        <div className="tc-name-area">
                          <h3 className="tc-name">
                            <Link href={listingPath(t.id)}>{t.user.name}</Link>
                          </h3>
                          <p className="tc-headline">{t.headline || t.subjects}</p>
                        </div>
                        <div className="tc-price-area">
                          <span className="tc-rate">{formatHourly(t.hourlyRate, currency)}</span>
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
                          <Link href={listingPath(t.id)} className="btn btn-sm">
                            View listing
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
              Ask availability
            </a>
          </>
        ) : !session ? (
          <>
            <Link className="btn btn-block" href="/register?role=student">
              Join to message
            </Link>
            <Link
              className="btn btn-secondary btn-block"
              href={`/login?next=${encodeURIComponent(`/tutors/${tutor.id}`)}`}
            >
              Sign in
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
