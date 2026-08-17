import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactTutorForm } from "@/components/ContactTutorForm";
import { ReviewForm } from "@/components/ReviewForm";
import { ReportButton } from "@/components/ReportButton";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import Link from "next/link";

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

  const isOwner = session?.user?.id === tutor.user.id;
  const isAdmin = session?.user?.role === "ADMIN";
  if (!tutor.active && !isOwner && !isAdmin) notFound();

  const avg =
    tutor.reviews.length > 0
      ? tutor.reviews.reduce((s, r) => s + r.rating, 0) / tutor.reviews.length
      : null;

  const highlighted =
    tutor.highlighted || (tutor.highlightedUntil && tutor.highlightedUntil > new Date());

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
          {tutor.videoUrl && (
            <p>
              <strong>Video:</strong>{" "}
              <a href={tutor.videoUrl} target="_blank" rel="noreferrer">
                Intro video
              </a>
            </p>
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
            Lesson payments are arranged directly with {tutor.user.name}. MyTutoringHub does not
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
      </div>
    </div>
  );
}
