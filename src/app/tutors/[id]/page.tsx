import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactTutorForm } from "@/components/ContactTutorForm";
import { ReviewForm } from "@/components/ReviewForm";
import { ReportButton } from "@/components/ReportButton";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { similarTutors } from "@/lib/search-tutors";
import { embedVideoSrc, openStreetMapEmbed } from "@/lib/media";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  return { title: tutor ? tutor.user.name : "Tutor" };
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

  const videoSrc = embedVideoSrc(tutor.videoUrl);
  const mapSrc = openStreetMapEmbed(tutor.location);
  const similar = await similarTutors({
    id: tutor.id,
    subjects: tutor.subjects,
    location: tutor.location,
    take: 4,
  });

  return (
    <div className="page">
      <div className="container stack">
        {!tutor.active && (isOwner || isAdmin) && (
          <p className="panel" style={{ borderColor: "var(--brand)", background: "rgba(15, 90, 70, 0.06)" }}>
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
        <div className="panel">
          <div className="meta" style={{ marginBottom: "0.65rem" }}>
            {highlighted && <span className="badge accent">Highlighted</span>}
            {tutor.verified && <span className="badge">Verified</span>}
            {tutor.offersFreeTrial && <span className="badge">Free trial</span>}
            {avg !== null && (
              <span>
                {avg.toFixed(1)} ★ · {tutor.reviews.length} reviews
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            {tutor.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tutor.photoUrl}
                alt=""
                width={72}
                height={72}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <div>
              <h1 className="page-title">{tutor.user.name}</h1>
              {tutor.headline && <p className="profile-headline">{tutor.headline}</p>}
            </div>
          </div>
          <div className="meta">
            <span className="price-tag">{formatHourly(tutor.hourlyRate, currency)}</span>
            <span>{tutor.location}</span>
            <span>
              {tutor.online ? "Online" : ""}
              {tutor.online && tutor.inPerson ? " · " : ""}
              {tutor.inPerson ? "In person" : ""}
            </span>
            {tutor.verified && tutor.phone && <span>Phone: {tutor.phone}</span>}
          </div>
          <p className="prose-block">{tutor.bio}</p>
          <p>
            <strong>Subjects:</strong> {tutor.subjects}
          </p>
          {tutor.levels && (
            <p>
              <strong>Levels:</strong> {tutor.levels}
            </p>
          )}
          {tutor.languages && (
            <p>
              <strong>Languages:</strong> {tutor.languages}
            </p>
          )}
          {tutor.qualifications && (
            <p>
              <strong>Qualifications:</strong> {tutor.qualifications}
            </p>
          )}
          {tutor.teachingMethod && (
            <p>
              <strong>Method:</strong> {tutor.teachingMethod}
            </p>
          )}
          {tutor.availability && (
            <p>
              <strong>Availability:</strong> {tutor.availability}
            </p>
          )}
          {tutor.videoUrl && !videoSrc && (
            <p>
              <strong>Video:</strong>{" "}
              <a href={tutor.videoUrl} target="_blank" rel="noreferrer">
                Intro video
              </a>
            </p>
          )}
          {videoSrc && (
            <div className="media-embed-wrap">
              <h3>Intro video</h3>
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
          )}
          {mapSrc && (
            <div className="media-embed-wrap">
              <h3>Area</h3>
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
            </div>
          )}
          {tutor.ads.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Subject ads</h3>
              <ul className="sub-list">
                {tutor.ads.map((ad) => (
                  <li key={ad.id}>
                    {ad.title} — {ad.subject} · {ad.level} · {formatHourly(ad.rate, currency)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="muted">
            Lesson payments are arranged directly with {tutor.user.name}. My Tutoring Hub does not
            process lesson fees.
          </p>
          {session?.user && (
            <ReportButton targetType="TUTOR" targetId={tutor.id} />
          )}
        </div>

        {session?.user?.role === "STUDENT" ? (
          <ContactTutorForm recipientId={tutor.user.id} tutorName={tutor.user.name} />
        ) : !session ? (
          <p className="panel muted">
            <Link href="/login">Log in</Link> with a Student Pass to message this tutor.
          </p>
        ) : null}

        <section className="panel">
          <h2>Reviews</h2>
          {tutor.reviews.length === 0 && <p className="muted">No published reviews yet.</p>}
          <div className="results">
            {tutor.reviews.map((r) => (
              <article key={r.id} className="ad-row">
                <strong>
                  {r.rating}/5 — {r.student.name}
                </strong>
                <p style={{ margin: 0 }}>{r.comment}</p>
              </article>
            ))}
          </div>
          {session?.user?.role === "STUDENT" && <ReviewForm tutorProfileId={tutor.id} />}
        </section>

        {similar.length > 0 && (
          <section>
            <h2 className="page-title" style={{ fontSize: "1.45rem" }}>
              Similar tutors
            </h2>
            <p className="muted">More tutors in the same subject or city.</p>
            <div className="tutor-grid similar-tutors">
              {similar.map((t) => (
                <Link key={t.id} href={`/tutors/${t.id}`} className="tutor-card">
                  <div className="tutor-avatar" aria-hidden>
                    {t.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.photoUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      t.user.name.slice(0, 1)
                    )}
                  </div>
                  <div className="tutor-card-body">
                    <div className="meta">
                      {t.verified && <span className="badge">Verified</span>}
                    </div>
                    <h3>{t.user.name}</h3>
                    <p className="tutor-headline">{t.headline || t.subjects}</p>
                    <div className="meta">
                      <strong className="price-tag">{formatHourly(t.hourlyRate, currency)}</strong>
                      <span>{t.location || "Online"}</span>
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
