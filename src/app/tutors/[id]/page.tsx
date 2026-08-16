import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactTutorForm } from "@/components/ContactTutorForm";
import { ReviewForm } from "@/components/ReviewForm";
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
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { student: { select: { name: true } } },
      },
    },
  });
  if (!tutor || (!tutor.active && session?.user?.role !== "ADMIN")) notFound();

  const avg =
    tutor.reviews.length > 0
      ? tutor.reviews.reduce((s, r) => s + r.rating, 0) / tutor.reviews.length
      : null;

  return (
    <div className="page">
      <div className="container" style={{ display: "grid", gap: "1.5rem" }}>
        <div className="panel">
          <div className="meta" style={{ marginBottom: "0.5rem" }}>
            {tutor.highlighted && <span className="badge accent">Highlighted</span>}
            {tutor.verified && <span className="badge">Verified</span>}
            {avg !== null && (
              <span>
                {avg.toFixed(1)} ★ · {tutor.reviews.length} reviews
              </span>
            )}
          </div>
          <h1 className="page-title">{tutor.user.name}</h1>
          <p style={{ fontSize: "1.15rem", marginTop: 0 }}>{tutor.headline}</p>
          <div className="meta">
            <span>${tutor.hourlyRate}/hr</span>
            <span>{tutor.location}</span>
            <span>
              {tutor.online ? "Online" : ""}
              {tutor.online && tutor.inPerson ? " · " : ""}
              {tutor.inPerson ? "In person" : ""}
            </span>
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{tutor.bio}</p>
          <p>
            <strong>Subjects:</strong> {tutor.subjects}
          </p>
          <p className="muted">
            Lesson payments are arranged directly with {tutor.user.name}. MyTutoringHub does not
            process lesson fees.
          </p>
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
          {tutor.reviews.length === 0 && <p className="muted">No reviews yet.</p>}
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
