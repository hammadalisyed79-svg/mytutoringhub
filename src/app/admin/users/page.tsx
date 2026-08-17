import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AdminActionButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  role?: string;
  suspended?: string;
  verified?: string;
  sub?: string;
  page?: string;
}>;

const PAGE_SIZE = 40;

function usersQuery(sp: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.set(k, v);
  }
  params.set("page", String(page));
  return params.toString();
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q || "").trim();

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { id: q },
      { role: q.toUpperCase() },
    ];
  }
  if (sp.role) where.role = sp.role;
  if (sp.suspended === "1") where.suspended = true;
  if (sp.suspended === "0") where.suspended = false;
  if (sp.verified === "1") where.emailVerified = { not: null };
  if (sp.verified === "0") where.emailVerified = null;
  if (sp.sub === "1") {
    where.subscriptions = { some: { status: { in: ["ACTIVE", "TRIALING"] } } };
  }
  if (sp.sub === "0") {
    where.subscriptions = { none: { status: { in: ["ACTIVE", "TRIALING"] } } };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIALING"] } },
          select: { plan: true, status: true, currentPeriodEnd: true },
        },
        tutorProfile: { select: { id: true, active: true, verified: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div>
        <h1 className="page-title">Users</h1>
        <p className="muted">Search, suspend, verify email, change roles, and grant plans.</p>
      </div>

      <form className="filters filters-wide" method="get">
        <label>
          Search
          <input name="q" defaultValue={sp.q || ""} placeholder="Email, name, id, role" />
        </label>
        <label>
          Role
          <select name="role" defaultValue={sp.role || ""}>
            <option value="">Any</option>
            <option value="STUDENT">Student</option>
            <option value="TUTOR">Tutor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label>
          Suspended
          <select name="suspended" defaultValue={sp.suspended || ""}>
            <option value="">Any</option>
            <option value="1">Suspended</option>
            <option value="0">Active</option>
          </select>
        </label>
        <label>
          Email
          <select name="verified" defaultValue={sp.verified || ""}>
            <option value="">Any</option>
            <option value="1">Verified</option>
            <option value="0">Unverified</option>
          </select>
        </label>
        <label>
          Subscription
          <select name="sub" defaultValue={sp.sub || ""}>
            <option value="">Any</option>
            <option value="1">Has active plan</option>
            <option value="0">No active plan</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      <p className="muted">{total} user{total === 1 ? "" : "s"}</p>

      {users.length === 0 && <p className="muted">No users match these filters.</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/admin/users/${u.id}`}>
                    <strong>{u.name}</strong>
                  </Link>
                  <div className="muted">{u.email}</div>
                </td>
                <td>{u.role}</td>
                <td>
                  {u.suspended ? "Suspended" : "OK"}
                  {u.emailVerified ? " · Email OK" : " · Unverified"}
                  {u.tutorProfile
                    ? u.tutorProfile.active
                      ? " · Listing on"
                      : " · Listing off"
                    : ""}
                </td>
                <td>
                  {u.subscriptions.length
                    ? u.subscriptions.map((s) => s.plan).join(", ")
                    : "—"}
                </td>
                <td>
                  <div className="admin-actions">
                    <Link href={`/admin/users/${u.id}`}>Open</Link>
                    <AdminActionButton
                      action={u.suspended ? "unsuspend_user" : "suspend_user"}
                      id={u.id}
                      label={u.suspended ? "Unsuspend" : "Suspend"}
                      confirm={u.suspended ? "Unsuspend this user?" : "Suspend this user?"}
                    />
                    <AdminActionButton
                      action="set_email_verified"
                      id={u.id}
                      label={u.emailVerified ? "Unverify email" : "Verify email"}
                      extra={{ emailVerified: !u.emailVerified }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <p className="muted">
          Page {page} of {pages}
          {page > 1 && (
            <>
              {" "}
              <Link href={`/admin/users?${usersQuery(sp, page - 1)}`}>
                Previous
              </Link>
            </>
          )}
          {page < pages && (
            <>
              {" "}
              <Link href={`/admin/users?${usersQuery(sp, page + 1)}`}>
                Next
              </Link>
            </>
          )}
        </p>
      )}
    </>
  );
}
