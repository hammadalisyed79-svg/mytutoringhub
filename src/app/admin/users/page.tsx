import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AdminUsersBulkTable } from "@/components/AdminBulk";
import { ADMIN_PAGE_SIZE, adminExportQuery, adminListQuery } from "@/lib/admin-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  role?: string;
  suspended?: string;
  verified?: string;
  sub?: string;
  page?: string;
}>;

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
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIALING"] } },
          select: { plan: true, status: true, currentPeriodEnd: true },
        },
        tutorProfile: { select: { id: true, active: true, verified: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    suspended: u.suspended,
    emailVerified: Boolean(u.emailVerified),
    plans: u.subscriptions.map((s) => s.plan).join(", "),
    listing: u.tutorProfile
      ? u.tutorProfile.active
        ? " · Listing on"
        : " · Listing off"
      : "",
  }));

  return (
    <>
      <div className="page-hero panel" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="muted">Search, suspend, verify email, change roles, and grant plans.</p>
        </div>
        <a className="btn btn-secondary btn-sm" href={`/api/admin/export?${adminExportQuery(sp, "users")}`}>
          Export CSV
        </a>
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

      <p className="muted">
        {total} user{total === 1 ? "" : "s"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      {users.length === 0 && <p className="muted">No users match these filters.</p>}

      {users.length > 0 ? <AdminUsersBulkTable users={rows} /> : null}

      {pages > 1 && (
        <p className="muted admin-pager">
          Page {page} of {pages}
          {page > 1 && (
            <>
              {" "}
              <Link href={`/admin/users?${adminListQuery(sp, page - 1)}`}>Previous</Link>
            </>
          )}
          {page < pages && (
            <>
              {" "}
              <Link href={`/admin/users?${adminListQuery(sp, page + 1)}`}>Next</Link>
            </>
          )}
        </p>
      )}
    </>
  );
}
