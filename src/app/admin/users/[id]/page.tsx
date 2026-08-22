import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  AdminActionButton,
  AdminDeleteUserForm,
  AdminGrantPlanForm,
  AdminRoleForm,
} from "@/components/AdminActions";
import {
  emailSequenceLabel,
  PROFILE_NURTURE_SEQUENCES,
} from "@/lib/email-sequence-labels";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Params) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tutorProfile: true,
      studentAds: { orderBy: { createdAt: "desc" }, take: 20 },
      subscriptions: { orderBy: { createdAt: "desc" } },
      reportsFiled: { orderBy: { createdAt: "desc" }, take: 10 },
      verificationRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      emailSequenceEvents: { orderBy: { sentAt: "desc" }, take: 30 },
      _count: {
        select: {
          messages: true,
          conversationsAsA: true,
          conversationsAsB: true,
          studentAds: true,
        },
      },
    },
  });
  if (!user) notFound();

  const conversationCount = user._count.conversationsAsA + user._count.conversationsAsB;

  const profileCompletion =
    user.tutorProfile &&
    getTutorProfileCompletion({
      name: user.name,
      photoUrl: user.tutorProfile.photoUrl,
      headline: user.tutorProfile.headline,
      bio: user.tutorProfile.bio,
      country: user.tutorProfile.country,
      location: user.tutorProfile.location,
      subjects: user.tutorProfile.subjects,
      hourlyRate: user.tutorProfile.hourlyRate,
      online: user.tutorProfile.online,
      inPerson: user.tutorProfile.inPerson,
      qualifications: user.tutorProfile.qualifications,
    });

  const profileNurtureEvents = user.emailSequenceEvents.filter((e) =>
    PROFILE_NURTURE_SEQUENCES.includes(e.sequence as (typeof PROFILE_NURTURE_SEQUENCES)[number]),
  );

  return (
    <>
      <div>
        <p className="muted">
          <Link href="/admin/users">← Users</Link>
        </p>
        <h1 className="page-title">{user.name}</h1>
        <p className="muted">
          {user.email} · {user.role} · joined {user.createdAt.toLocaleString()}
        </p>
      </div>

      <section className="panel">
        <h2>Account</h2>
        <p>
          Status: {user.suspended ? "Suspended" : "OK"} · Email:{" "}
          {user.emailVerified ? `verified ${user.emailVerified.toLocaleDateString()}` : "unverified"}
        </p>
        <div className="admin-actions">
          <AdminActionButton
            action={user.suspended ? "unsuspend_user" : "suspend_user"}
            id={user.id}
            label={user.suspended ? "Unsuspend" : "Suspend"}
            confirm={user.suspended ? "Unsuspend this user?" : "Suspend this user and hide listings?"}
            danger={!user.suspended}
          />
          <AdminActionButton
            action="set_email_verified"
            id={user.id}
            label={user.emailVerified ? "Mark email unverified" : "Mark email verified"}
            extra={{ emailVerified: !user.emailVerified }}
          />
        </div>
        <h3>Role</h3>
        <AdminRoleForm userId={user.id} role={user.role} />
      </section>

      <section className="panel">
        <h2>Complimentary plans</h2>
        <p className="muted">Create or extend an active plan without payment (admin override).</p>
        <AdminGrantPlanForm userId={user.id} />
      </section>

      {user.tutorProfile && (
        <section className="panel">
          <h2>Tutor listing</h2>
          <p>
            {user.tutorProfile.active ? "Active" : "Inactive"}
            {user.tutorProfile.forceActive ? " · admin force-active" : ""}
            {user.tutorProfile.verified ? " · Verified" : ""}
            {user.tutorProfile.highlighted ? " · Highlighted" : ""}
          </p>
          <p className="muted">
            {user.tutorProfile.subjects || "No subjects"} · {user.tutorProfile.location}
          </p>
          <div className="admin-actions">
            <Link href={`/admin/tutors/${user.tutorProfile.id}`}>Edit listing</Link>
            <Link href={`/tutors/${user.tutorProfile.id}`}>Public profile</Link>
            <AdminActionButton
              action={user.tutorProfile.active ? "deactivate_tutor" : "activate_tutor"}
              id={user.tutorProfile.id}
              label={user.tutorProfile.active ? "Deactivate listing" : "Force-activate listing"}
            />
            <AdminActionButton
              action="set_verified"
              id={user.tutorProfile.id}
              label={user.tutorProfile.verified ? "Remove verified badge" : "Verify tutor"}
              extra={{ verified: !user.tutorProfile.verified }}
            />
          </div>
          {profileCompletion && !profileCompletion.complete && (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Profile {profileCompletion.requiredDone}/{profileCompletion.requiredTotal} complete —
              missing: {profileCompletion.missingRequired.join(", ")}
            </p>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Automated nurture emails</h2>
        <p className="muted">
          Reminder emails sent to this user (not in-app messages).{" "}
          <Link href="/admin/nurture">View all nurture emails</Link>
        </p>
        {user.emailSequenceEvents.length === 0 && (
          <p className="muted">No automated emails recorded yet.</p>
        )}
        {user.emailSequenceEvents.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {user.emailSequenceEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{emailSequenceLabel(event.sequence)}</td>
                    <td>{event.sentAt.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {profileNurtureEvents.length === 0 && user.tutorProfile && profileCompletion && !profileCompletion.complete && (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            No profile reminder sent yet — eligible after daily cron (10:00 UTC) if profile is started
            and email is verified.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Subscriptions & checkouts</h2>
        {user.subscriptions.length === 0 && <p className="muted">No payments or plans.</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Status</th>
                <th>Tracker</th>
                <th>Period end</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {user.subscriptions.map((s) => (
                <tr key={s.id}>
                  <td>{s.plan}</td>
                  <td>{s.status}</td>
                  <td className="muted">{s.stripeSubscriptionId || "—"}</td>
                  <td>{s.currentPeriodEnd?.toLocaleDateString() || "—"}</td>
                  <td>
                    {s.status !== "CANCELED" && (
                      <AdminActionButton
                        action="revoke_subscription"
                        id={s.id}
                        label="Revoke"
                        confirm="Cancel this subscription?"
                        danger
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Activity</h2>
        <p>
          {conversationCount} conversation{conversationCount === 1 ? "" : "s"} · {user._count.messages}{" "}
          messages sent · {user._count.studentAds} student request
          {user._count.studentAds === 1 ? "" : "s"}
        </p>
        {user.studentAds.length === 0 && <p className="muted">No student requests.</p>}
        <div className="results">
          {user.studentAds.map((ad) => (
            <article key={ad.id} className="ad-row">
              <strong>
                {ad.title} ({ad.status})
              </strong>
              <span className="muted">
                {ad.subject} · {ad.location}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Reports filed</h2>
        {user.reportsFiled.length === 0 && <p className="muted">None.</p>}
        {user.reportsFiled.map((r) => (
          <p key={r.id} className="muted">
            {r.status} · {r.targetType}: {r.reason.slice(0, 160)}
          </p>
        ))}
      </section>

      <section className="panel">
        <h2>Danger zone</h2>
        <AdminDeleteUserForm userId={user.id} email={user.email} />
      </section>
    </>
  );
}
