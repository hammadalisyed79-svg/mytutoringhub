import { notFound } from "next/navigation";
import Link from "next/link";
import type { Session } from "next-auth";
import { TutorAvatar } from "@/components/TutorAvatar";
import { ContactTutorForm } from "@/components/ContactTutorForm";
import { ShareTutorButton } from "@/components/ShareTutorButton";
import { TutorTrustBadgePill } from "@/components/TutorTrustBadgePill";
import { JsonLd } from "@/components/JsonLd";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { similarTutors, slugify } from "@/lib/search-tutors";
import { listingPath } from "@/lib/subject-profile";
import { formatTutorPlace, formatTutorAvailability } from "@/lib/tutor-catalog";
import {
  canViewTutorProfilePublicly,
  tutorPublicVisibilityInput,
} from "@/lib/tutor-public-eligibility";
import { computeTutorTrustBadge, getTutorBadgeStats, getTrustBadgesForProfiles } from "@/lib/tutor-badges";
import { isBoostActive, isHighlightActive } from "@/lib/subscription";
import { publicTutorBio, TUTOR_VERIFY_PROFILE_MESSAGE } from "@/lib/tutor-listing-copy";
import {
  breadcrumbJsonLd,
  pageMetadata,
  subjectListingJsonLd,
  truncateDescription,
} from "@/lib/seo";
import { trackProductEvent } from "@/lib/product-events";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function ListingCta({
  listingId,
  canMessage,
  session,
}: {
  listingId: string;
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
          Join free to message
        </Link>
        <Link className="btn btn-secondary btn-block" href={`/login?callbackUrl=${encodeURIComponent(listingPath(listingId))}`}>
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="profile-cta-stack">
      <a className="btn btn-block" href="#message-tutor">
        Contact options
      </a>
    </div>
  );
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const listing = await prisma.subjectProfile.findUnique({
    where: { id },
    select: {
      title: true,
      headline: true,
      description: true,
      subject: true,
      location: true,
      rate: true,
      status: true,
      tutorProfile: {
        select: {
          active: true,
          forceActive: true,
          photoUrl: true,
          headline: true,
          bio: true,
          country: true,
          location: true,
          subjects: true,
          online: true,
          inPerson: true,
          qualifications: true,
          user: { select: { name: true, emailVerified: true, suspended: true } },
        },
      },
    },
  });
  if (!listing || listing.status !== "ACTIVE") {
    return pageMetadata({
      title: "Listing not found",
      description: "This subject listing is unavailable.",
      path: listingPath(id),
      noIndex: true,
    });
  }
  const name = listing.tutorProfile.user.name?.trim() || "Tutor";
  const desc =
    listing.headline ||
    listing.description ||
    listing.tutorProfile.headline ||
    publicTutorBio(listing.tutorProfile.bio) ||
    `${name} offers ${listing.subject} tutoring.`;
  return pageMetadata({
    title: `${listing.title} · ${listing.subject}`,
    description: truncateDescription(
      `${desc} ${listing.location ? `Based in ${listing.location}.` : ""} Book on My Tutoring Hub.`,
      155,
    ),
    path: listingPath(id),
  });
}

export default async function SubjectListingPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const currency = await getVisitorCurrency();
  const now = new Date();

  const listing = await prisma.subjectProfile.findUnique({
    where: { id },
    include: {
      tutorProfile: {
        include: {
          user: { select: { id: true, name: true, emailVerified: true, suspended: true } },
          reviews: {
            where: { status: "PUBLISHED" },
            select: { rating: true, comment: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 6,
          },
        },
      },
    },
  });

  if (!listing) notFound();

  const tutor = listing.tutorProfile;
  const viewerId = session?.user?.id;
  const isOwner = Boolean(viewerId && viewerId === tutor.userId);
  const isAdmin = session?.user?.role === "ADMIN";

  if (
    listing.status !== "ACTIVE" ||
    (!isOwner && !isAdmin && !canViewTutorProfilePublicly(tutorPublicVisibilityInput(tutor)))
  ) {
    notFound();
  }

  const badgeStats = await getTutorBadgeStats(tutor.id);
  const trustBadge = computeTutorTrustBadge(badgeStats);
  const avg =
    tutor.reviews.length > 0
      ? tutor.reviews.reduce((s, r) => s + r.rating, 0) / tutor.reviews.length
      : null;
  const highlighted = isHighlightActive(
    listing.highlightedUntil || tutor.highlightedUntil,
    tutor.highlighted,
    now,
  );
  const boosted = isBoostActive(listing.boostUntil || tutor.boostUntil, now);
  const place = formatTutorPlace(listing.location || tutor.location, listing.country || tutor.country);
  const availability = formatTutorAvailability({
    location: listing.location || tutor.location,
    country: listing.country || tutor.country,
    online: listing.online,
    inPerson: listing.inPerson,
  });
  const bio = publicTutorBio(listing.description || tutor.bio);
  const canMessage = session?.user?.role === "STUDENT";
  const viewer =
    canMessage && session?.user
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { emailVerified: true, email: true },
        })
      : null;
  const tutorName = tutor.user.name?.trim() || "Tutor";
  const initial = tutorName.slice(0, 1).toUpperCase();
  const hourlyLabel = formatHourly(listing.rate, currency);

  const similar = await similarTutors({
    id: listing.id,
    excludeTutorProfileId: tutor.id,
    subjects: listing.subject,
    location: listing.location || tutor.location,
    take: 4,
  });
  const similarBadges = await getTrustBadgesForProfiles(similar.map((t) => t.tutorProfileId));

  trackProductEvent("listing_viewed", {
    listingId: listing.id,
    subject: listing.subject,
    tutorProfileId: tutor.id,
    viewerId: viewerId || null,
  });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Find tutors", path: "/search" },
              {
                name: listing.subject,
                path: `/s/${slugify(listing.subject)}`,
              },
              { name: listing.title, path: listingPath(listing.id) },
            ]),
            subjectListingJsonLd({
              listingId: listing.id,
              tutorProfileId: tutor.id,
              name: tutorName,
              title: listing.title,
              description: listing.headline || bio || listing.title,
              subject: listing.subject,
              location: place || listing.location,
              hourlyRatePkr: listing.rate,
              currency,
              hourlyLabel,
              photoUrl: tutor.photoUrl,
              rating: avg,
              reviewCount: tutor.reviews.length,
              verified: tutor.verified,
            }),
          ],
        }}
      />

      <div className="page">
        <div className="container profile-page">
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            <Link href="/search">← Search</Link>
            {" · "}
            <Link href={`/s/${slugify(listing.subject)}`}>{listing.subject} tutors</Link>
            {" · "}
            <Link href={`/tutors/${tutor.id}`}>Full tutor profile</Link>
          </p>

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
                <h1 className="profile-name">{tutorName}</h1>
                <p className="profile-headline-v2">{listing.headline || listing.title}</p>

                <div className="profile-badges-row">
                  {isOwner ? (
                    tutor.verified ? (
                      <span className="badge badge-verified">✓ Verified</span>
                    ) : (
                      <span className="badge tutor-owner-verify-badge">Not Verified</span>
                    )
                  ) : (
                    <>
                      <TutorTrustBadgePill badge={trustBadge} fullLabel />
                      {tutor.verified && <span className="badge badge-verified">✓ Verified</span>}
                    </>
                  )}
                  {boosted && <span className="badge accent">Boosted</span>}
                  {highlighted && <span className="badge accent">Featured</span>}
                  {tutor.offersFreeTrial && <span className="badge">Free trial</span>}
                </div>

                {isOwner && !tutor.verified && (
                  <p className="profile-owner-verify-hint muted">{TUTOR_VERIFY_PROFILE_MESSAGE}</p>
                )}

                {avg !== null ? (
                  <p className="profile-rating-block">
                    <strong>{avg.toFixed(1)}</strong>
                    <span className="muted">
                      {" "}
                      · {tutor.reviews.length} {tutor.reviews.length === 1 ? "review" : "reviews"}
                    </span>
                  </p>
                ) : (
                  <p className="muted profile-rating-empty">No reviews yet</p>
                )}

                <p className="profile-rate-lg">{hourlyLabel}</p>
                {availability && (
                  <ul className="profile-facts-list">
                    <li>{availability}</li>
                  </ul>
                )}

                <ListingCta listingId={listing.id} canMessage={canMessage} session={session} />

                <div className="profile-share-row">
                  <ShareTutorButton
                    tutorId={tutor.id}
                    tutorName={tutorName}
                    path={listingPath(listing.id)}
                  />
                </div>
              </div>
            </aside>

            <div className="profile-main">
              <section className="profile-section">
                <h2 className="profile-section-title">{listing.subject}</h2>
                <p className="muted">
                  {[
                    listing.board,
                    listing.qualification || (listing.level !== "All levels" ? listing.level : null),
                    listing.syllabusCode,
                  ]
                    .filter(Boolean)
                    .join(" · ") || listing.level}
                </p>
                {bio ? <p className="profile-bio">{bio}</p> : null}
                {place && <p className="muted">{place}</p>}
              </section>

              <section className="profile-section" id="message-tutor">
                <h2 className="profile-section-title">Contact</h2>
                {canMessage ? (
                  <ContactTutorForm
                    recipientId={tutor.userId}
                    tutorName={tutorName}
                    emailVerified={Boolean(viewer?.emailVerified)}
                    viewerEmail={viewer?.email}
                    subjectProfileId={listing.id}
                  />
                ) : !session ? (
                  <p className="muted">
                    <Link href="/register?role=student">Create a free student account</Link> to message{" "}
                    {tutorName}.
                  </p>
                ) : (
                  <p className="muted">
                    Switch to a student account to message tutors, or{" "}
                    <Link href={`/tutors/${tutor.id}`}>view the full profile</Link>.
                  </p>
                )}
              </section>

              {tutor.reviews.length > 0 && (
                <section className="profile-section">
                  <h2 className="profile-section-title">Reviews</h2>
                  <ul className="profile-reviews-list">
                    {tutor.reviews.map((r, i) => (
                      <li key={i}>
                        <strong>{r.rating.toFixed(1)} ★</strong>
                        {r.comment?.trim() ? <p>{r.comment.trim()}</p> : null}
                      </li>
                    ))}
                  </ul>
                  <p>
                    <Link href={`/tutors/${tutor.id}`}>See full tutor profile →</Link>
                  </p>
                </section>
              )}
            </div>
          </div>

          {similar.length > 0 && (
            <section className="profile-similar">
              <h2 className="profile-section-title">Similar listings</h2>
              <p className="muted">More {listing.subject} tutors nearby.</p>
              <div className="tutor-grid similar-tutors">
                {similar.map((t) => {
                  const tAvg =
                    t.reviews.length > 0
                      ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length
                      : null;
                  return (
                    <div key={t.id} className="tc-card">
                      <div className="tc-left">
                        <TutorAvatar
                          className="tc-avatar"
                          photoUrl={t.photoUrl}
                          cropX={t.photoCropX}
                          cropY={t.photoCropY}
                          cropZoom={t.photoCropZoom}
                          initial={(t.user.name || "T").slice(0, 1).toUpperCase()}
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
                            <p className="tc-headline">{t.headline || t.subject}</p>
                          </div>
                          <div className="tc-price-area">
                            <span className="tc-rate">{formatHourly(t.hourlyRate, currency)}</span>
                          </div>
                        </div>
                        <div className="tc-badges">
                          {t.verified && <span className="badge badge-verified">✓ Verified</span>}
                          {tAvg !== null && (
                            <span className="tc-rating">
                              <strong>{tAvg.toFixed(1)}</strong>
                            </span>
                          )}
                        </div>
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
      </div>
    </>
  );
}
