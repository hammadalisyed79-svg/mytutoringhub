import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function Stat({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="admin-stat">
      <strong>{value.toLocaleString()}</strong>
      <span>{label}</span>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const [
    users,
    tutors,
    tutorsActive,
    students,
    suspended,
    unverified,
    openReports,
    pendingVerification,
    incompletePayments,
    studentAds,
    tutorAds,
    conversations,
    pastPapers,
    recentUsers,
    recentPayments,
    recentReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tutorProfile.count(),
    prisma.tutorProfile.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { suspended: true } }),
    prisma.user.count({ where: { emailVerified: null, role: { not: "ADMIN" } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { status: "INCOMPLETE" } }),
    prisma.studentAd.count(),
    prisma.tutorAd.count(),
    prisma.conversation.count(),
    prisma.pastPaper.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, role: true, createdAt: true, suspended: true },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { reporter: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Command center</h1>
        <p className="muted">Full control over users, listings, payments, safety, and site settings.</p>
      </div>

      <div className="admin-stat-grid">
        <Stat href="/admin/users" label="Users" value={users} />
        <Stat href="/admin/tutors?active=1" label="Active tutors" value={tutorsActive} />
        <Stat href="/admin/tutors?active=0" label="Inactive tutors" value={tutors - tutorsActive} />
        <Stat href="/admin/tutor-supply" label="Tutor supply desk" value={tutorsActive} />
        <Stat href="/admin/users?role=STUDENT" label="Students" value={students} />
        <Stat href="/admin/users?suspended=1" label="Suspended" value={suspended} />
        <Stat href="/admin/users?verified=0" label="Unverified emails" value={unverified} />
        <Stat href="/admin/reports" label="Open reports" value={openReports} />
        <Stat href="/admin/verifications" label="Pending verification" value={pendingVerification} />
        <Stat href="/admin/payments?status=INCOMPLETE" label="Incomplete payments" value={incompletePayments} />
        <Stat href="/admin/ads" label="Ads" value={studentAds + tutorAds} />
        <Stat href="/admin/messages" label="Conversations" value={conversations} />
        <Stat href="/admin/past-papers" label="Past papers" value={pastPapers} />
      </div>

      <div className="admin-quick-links">
        <Link href="/admin/tutor-supply">Tutor supply</Link>
        <Link href="/admin/users">Find a user</Link>
        <Link href="/admin/plans">Plans & prices</Link>
        <Link href="/admin/settings">Site settings</Link>
        <Link href="/admin/payments">Recover a payment</Link>
        <Link href="/admin/reports">Safety queue</Link>
        <Link href="/admin/audit">Audit log</Link>
        <Link href="/admin/nurture">Nurture emails</Link>
      </div>

      <section className="panel">
        <h2>Recent signups</h2>
        {recentUsers.length === 0 && <p className="muted">No users yet.</p>}
        <div className="results">
          {recentUsers.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`} className="ad-row">
              <strong>
                {u.name} · {u.role}
                {u.suspended ? " · Suspended" : ""}
              </strong>
              <span className="muted">{u.email}</span>
              <span className="muted">{u.createdAt.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Recent payments</h2>
        {recentPayments.length === 0 && <p className="muted">No checkouts yet.</p>}
        <div className="results">
          {recentPayments.map((s) => (
            <Link key={s.id} href="/admin/payments" className="ad-row">
              <strong>
                {s.plan} · {s.status}
              </strong>
              <span className="muted">
                {s.user.name} · {s.user.email}
              </span>
              <span className="muted">{s.createdAt.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Recent reports</h2>
        {recentReports.length === 0 && <p className="muted">No reports yet.</p>}
        <div className="results">
          {recentReports.map((r) => (
            <Link key={r.id} href="/admin/reports" className="ad-row">
              <strong>
                {r.status} · {r.targetType}
              </strong>
              <span className="muted">
                {r.reporter.name}: {r.reason.slice(0, 140)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
