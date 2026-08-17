import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { admin: { select: { name: true, email: true } } },
  });

  return (
    <>
      <div>
        <h1 className="page-title">Audit log</h1>
        <p className="muted">Every admin mutation is recorded here.</p>
      </div>

      {logs.length === 0 && <p className="muted">No admin actions yet.</p>}

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
                  {row.admin.name}
                  <div className="muted">{row.admin.email}</div>
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
    </>
  );
}
