import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ADMIN_PAGE_SIZE, adminExportQuery, adminListQuery } from "@/lib/admin-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; action?: string; page?: string }>;

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    ...(sp.action ? { action: sp.action } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" as const } },
            { targetType: { contains: q, mode: "insensitive" as const } },
            { targetId: { contains: q, mode: "insensitive" as const } },
            { detail: { contains: q, mode: "insensitive" as const } },
            { admin: { email: { contains: q, mode: "insensitive" as const } } },
            { admin: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, logs, actionRows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { admin: { select: { name: true, email: true } } },
    }),
    prisma.adminAuditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
      take: 80,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const actions = actionRows.map((r) => r.action).filter(Boolean);

  return (
    <>
      <div>
        <h1 className="page-title">Audit log</h1>
        <p className="muted">Every admin mutation is recorded here.</p>
        <p style={{ marginTop: "0.75rem" }}>
          <a className="btn btn-secondary btn-sm" href={`/api/admin/export?${adminExportQuery(sp, "audit")}`}>
            Export CSV
          </a>
        </p>
      </div>

      <form className="filters filters-wide" method="get">
        <label>
          Search
          <input name="q" defaultValue={sp.q || ""} placeholder="Action, admin, target, detail" />
        </label>
        <label>
          Action
          <select name="action" defaultValue={sp.action || ""}>
            <option value="">Any</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      <p className="muted">
        {total} entr{total === 1 ? "y" : "ies"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      {logs.length === 0 && <p className="muted">No admin actions match.</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt.toLocaleString()}</td>
                <td>
                  {row.admin ? (
                    <>
                      {row.admin.name}
                      <div className="muted">{row.admin.email}</div>
                    </>
                  ) : (
                    <span className="muted">Deleted admin</span>
                  )}
                </td>
                <td>{row.action}</td>
                <td>
                  {row.targetType}
                  {row.targetType === "User" ? (
                    <>
                      {" "}
                      <Link href={`/admin/users/${row.targetId}`}>open</Link>
                    </>
                  ) : null}
                  <div className="muted">{row.targetId}</div>
                </td>
                <td className="muted">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <p className="muted admin-pager">
          Page {page} of {pages}
          {page > 1 && (
            <>
              {" "}
              <Link href={`/admin/audit?${adminListQuery(sp, page - 1)}`}>Previous</Link>
            </>
          )}
          {page < pages && (
            <>
              {" "}
              <Link href={`/admin/audit?${adminListQuery(sp, page + 1)}`}>Next</Link>
            </>
          )}
        </p>
      )}
    </>
  );
}
