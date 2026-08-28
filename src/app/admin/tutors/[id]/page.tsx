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
import { listingPath } from "@/lib/subject-profile";

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
      subjectProfiles: { orderBy: { createdAt: "desc" } },
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
          {tutor.verified ? " · Verified" : ""} · {tutor.subjectProfiles.length} subject profile
          {tutor.subjectProfiles.length === 1 ? "" : "s"}
        </p>
      </div>

      <section className="panel">
        <h2>Account listing controls</h2>
        <div className="admin-actions">
          <AdminToggleTutorButton id={tutor.id} active={tutor.active} />
          <AdminActionButton
            action="set_verified"
            id={tutor.id}
            label={tutor.verified ? "Remove verified badge" : "Grant verified badge"}
            extra={{ verified: !tutor.verified }}
          />
          <Link href={`/tutors/${tutor.id}`}>Public account hub</Link>
        </div>
        <div className="admin-actions" style={{ marginTop: "0.75rem" }}>
          <AdminBoostForm id={tutor.id} action="set_highlight" label="Account highlight days" />
          <AdminBoostForm id={tutor.id} action="set_boost" label="Account boost days" />
        </div>
        <p className="muted" style={{ marginBottom: 0, marginTop: "0.75rem" }}>
          Prefer per-listing boost/highlight below — search ranks subject profiles individually.
        </p>
      </section>

      <section className="panel">
        <h2>Edit account profile</h2>
        <AdminTutorEditForm tutor={tutor} />
      </section>

      <section className="panel">
        <h2>Subject profiles</h2>
        {tutor.subjectProfiles.length === 0 && (
          <p className="muted">No subject profiles yet (legacy ads may still exist below).</p>
        )}
        <div className="results">
          {tutor.subjectProfiles.map((listing) => (
            <article key={listing.id} className="ad-row">
              <strong>
                {listing.title} ({listing.status})
              </strong>
              <span className="muted">
                {listing.subject} · {listing.level} · {listing.location} · PKR {listing.rate}/hr
                {listing.boostUntil ? ` · boost until ${listing.boostUntil.toISOString().slice(0, 10)}` : ""}
                {listing.highlightedUntil
                  ? ` · highlight until ${listing.highlightedUntil.toISOString().slice(0, 10)}`
                  : ""}
              </span>
              <div className="admin-actions">
                <Link href={listingPath(listing.id)}>Public listing</Link>
                {listing.status !== "HIDDEN" ? (
                  <AdminActionButton action="hide_subject_profile" id={listing.id} label="Hide" />
                ) : (
                  <AdminActionButton
                    action="restore_subject_profile"
                    id={listing.id}
                    label="Restore"
                  />
                )}
                {listing.status === "ACTIVE" && (
                  <AdminActionButton action="pause_subject_profile" id={listing.id} label="Pause" />
                )}
                <AdminActionButton
                  action="delete_subject_profile"
                  id={listing.id}
                  label="Delete"
                  confirm="Delete this subject profile?"
                  danger
                />
              </div>
              <div className="admin-actions" style={{ marginTop: "0.5rem" }}>
                <AdminBoostForm
                  id={listing.id}
                  action="set_listing_highlight"
                  label="Highlight days"
                />
                <AdminBoostForm id={listing.id} action="set_listing_boost" label="Boost days" />
              </div>
            </article>
          ))}
        </div>
      </section>

      {tutor.ads.length > 0 && (
        <section className="panel">
          <h2>Legacy tutor ads</h2>
          <p className="muted">Kept during transition — prefer Subject profiles above.</p>
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
      )}
    </>
  );
}
