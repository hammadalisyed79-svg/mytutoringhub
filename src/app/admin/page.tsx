import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AdminHideAdButton,
  AdminToggleTutorButton,
  AdminActionButton,
} from "@/components/AdminActions";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const [users, ads, tutors, subscriptions, verifications, reports, reviews, tutorAds] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.studentAd.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.tutorProfile.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.subscription.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.verificationRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.report.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { reporter: { select: { name: true, email: true } } },
      }),
      prisma.review.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 50,
        include: {
          student: { select: { name: true } },
          tutorProfile: { include: { user: { select: { name: true } } } },
        },
      }),
      prisma.tutorAd.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { tutorProfile: { include: { user: { select: { name: true } } } } },
      }),
    ]);

  return (
    <div className="page">
      <div className="container stack-lg">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="muted">Verification, reports, reviews, listings, and subscriptions.</p>
        </div>

        <section className="panel">
          <h2>Verification queue ({verifications.length})</h2>
          {verifications.length === 0 && <p className="muted">No pending requests.</p>}
          <div className="results">
            {verifications.map((v) => (
              <article key={v.id} className="ad-row">
                <strong>
                  {v.user.name} · {v.user.email}
                </strong>
                <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                  {v.docUrls}
                </p>
                {v.notes && <p>{v.notes}</p>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <AdminActionButton action="verify_approve" id={v.id} label="Approve" />
                  <AdminActionButton action="verify_reject" id={v.id} label="Reject" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Review moderation ({reviews.length})</h2>
          {reviews.length === 0 && <p className="muted">No pending reviews.</p>}
          <div className="results">
            {reviews.map((r) => (
              <article key={r.id} className="ad-row">
                <strong>
                  {r.rating}/5 — {r.student.name} → {r.tutorProfile.user.name}
                </strong>
                <p>{r.comment}</p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <AdminActionButton action="review_publish" id={r.id} label="Publish" />
                  <AdminActionButton action="review_hide" id={r.id} label="Hide" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Open reports ({reports.length})</h2>
          {reports.length === 0 && <p className="muted">No open reports.</p>}
          <div className="results">
            {reports.map((r) => (
              <article key={r.id} className="ad-row">
                <strong>
                  {r.targetType} · {r.targetId}
                </strong>
                <p>
                  From {r.reporter.name}: {r.reason}
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <AdminActionButton action="report_resolve" id={r.id} label="Resolve" />
                  <AdminActionButton action="report_dismiss" id={r.id} label="Dismiss" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Users</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.suspended ? "Suspended" : "OK"}</td>
                    <td>
                      <AdminActionButton
                        action={u.suspended ? "unsuspend_user" : "suspend_user"}
                        id={u.id}
                        label={u.suspended ? "Unsuspend" : "Suspend"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Tutor profiles</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Subjects</th>
                  <th>Flags</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tutors.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.user.name}
                      <div className="muted">{t.user.email}</div>
                    </td>
                    <td>{t.subjects}</td>
                    <td>
                      {t.active ? "Active" : "Inactive"}
                      {t.verified ? " · Verified" : ""}
                      {t.highlighted ? " · Highlighted" : ""}
                    </td>
                    <td>
                      <AdminToggleTutorButton id={t.id} active={t.active} />{" "}
                      <AdminActionButton
                        action="set_verified"
                        id={t.id}
                        label={t.verified ? "Unverify" : "Verify"}
                        extra={{ verified: !t.verified }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Tutor ads</h2>
          <div className="results">
            {tutorAds.map((ad) => (
              <article key={ad.id} className="ad-row">
                <strong>
                  {ad.title} · {ad.tutorProfile.user.name} ({ad.status})
                </strong>
                <span className="muted">
                  {ad.subject} · {ad.location}
                </span>
                {ad.status !== "HIDDEN" && (
                  <AdminActionButton action="hide_tutor_ad" id={ad.id} label="Hide ad" />
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Student ads</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td>{ad.title}</td>
                    <td>
                      {ad.user.name}
                      <div className="muted">{ad.user.email}</div>
                    </td>
                    <td>{ad.status}</td>
                    <td>{ad.status !== "HIDDEN" && <AdminHideAdButton id={ad.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Subscriptions</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Period end</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.user.name}
                      <div className="muted">{s.user.email}</div>
                    </td>
                    <td>{s.plan}</td>
                    <td>{s.status}</td>
                    <td>{s.currentPeriodEnd?.toLocaleDateString() || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
