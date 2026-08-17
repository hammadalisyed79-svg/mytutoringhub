import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import {
  AdminActionButton,
  AdminBoostForm,
  AdminToggleTutorButton,
  AdminTutorEditForm,
} from "@/components/AdminActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutor listing · Admin" };

export default async function AdminTutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, suspended: true } },
      ads: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!tutor) notFound();

  return (
    <>
      <div>
        <p className="muted">
          <Link href="/admin/tutors">← Tutors</Link>
          {" · "}
          <Link href={`/admin/users/${tutor.user.id}`}>User record</Link>
        </p>
        <h1 className="page-title">{tutor.user.name}</h1>
        <p className="muted">
          {tutor.user.email}
          {tutor.user.suspended ? " · Suspended" : ""} · {tutor.active ? "Listed" : "Hidden"}
          {tutor.verified ? " · Verified" : ""}
        </p>
      </div>

      <section className="panel">
        <h2>Listing controls</h2>
        <div className="admin-actions">
          <AdminToggleTutorButton id={tutor.id} active={tutor.active} />
          <AdminActionButton
            action="set_verified"
            id={tutor.id}
            label={tutor.verified ? "Remove verified badge" : "Grant verified badge"}
            extra={{ verified: !tutor.verified }}
          />
          <Link href={`/tutors/${tutor.id}`}>Public profile</Link>
        </div>
        <div className="admin-actions" style={{ marginTop: "0.75rem" }}>
          <AdminBoostForm id={tutor.id} action="set_highlight" label="Highlight days" />
          <AdminBoostForm id={tutor.id} action="set_boost" label="Boost days" />
        </div>
      </section>

      <section className="panel">
        <h2>Edit listing</h2>
        <AdminTutorEditForm tutor={tutor} />
      </section>

      <section className="panel">
        <h2>Subject ads</h2>
        {tutor.ads.length === 0 && <p className="muted">No ads.</p>}
        <div className="results">
          {tutor.ads.map((ad) => (
            <article key={ad.id} className="ad-row">
              <strong>
                {ad.title} ({ad.status})
              </strong>
              <span className="muted">
                {ad.subject} · {ad.location}
              </span>
              <div className="admin-actions">
                {ad.status !== "HIDDEN" ? (
                  <AdminActionButton action="hide_tutor_ad" id={ad.id} label="Hide" />
                ) : (
                  <AdminActionButton action="restore_tutor_ad" id={ad.id} label="Restore" />
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
