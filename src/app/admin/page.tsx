import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminHideAdButton, AdminToggleTutorButton } from "@/components/AdminActions";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const [users, ads, tutors, subscriptions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
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
  ]);

  return (
    <div className="page">
      <div className="container stack-lg">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="muted">Moderate users, listings, ads, and subscriptions.</p>
        </div>

        <section className="panel">
          <h2>Users</h2>
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.createdAt.toLocaleDateString()}</td>
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
                    <AdminToggleTutorButton id={t.id} active={t.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
