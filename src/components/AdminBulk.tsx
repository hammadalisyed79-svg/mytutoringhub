"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminActionButton } from "@/components/AdminActions";

async function postAdmin(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Action failed");
  }
  return data;
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
  emailVerified: boolean;
  plans: string;
  listing: string;
};

export function AdminUsersBulkTable({ users }: { users: AdminUserRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allIds = useMemo(() => users.map((u) => u.id), [users]);
  const allSelected = allIds.length > 0 && selected.length === allIds.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : allIds);
  }

  async function runBulk(action: "bulk_suspend_users" | "bulk_unsuspend_users") {
    if (selected.length === 0) return;
    const label = action === "bulk_suspend_users" ? "suspend" : "unsuspend";
    if (!window.confirm(`${label} ${selected.length} selected user${selected.length === 1 ? "" : "s"}?`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postAdmin({ action, ids: selected });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
      setBusy(false);
    }
  }

  return (
    <>
      {selected.length > 0 ? (
        <div className="admin-bulk-bar panel">
          <span>
            <strong>{selected.length}</strong> selected
          </span>
          <div className="admin-bulk-bar-actions">
            <button
              type="button"
              className="btn btn-sm"
              disabled={busy}
              onClick={() => void runBulk("bulk_suspend_users")}
            >
              Suspend selected
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => void runBulk("bulk_unsuspend_users")}
            >
              Unsuspend selected
            </button>
            <button type="button" className="link-btn" disabled={busy} onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all users on this page"
                />
              </th>
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
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggle(u.id)}
                    aria-label={`Select ${u.email}`}
                  />
                </td>
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
                  {u.listing}
                </td>
                <td>{u.plans || "—"}</td>
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
    </>
  );
}

export type AdminReportRow = {
  id: string;
  status: string;
  category: string | null;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
};

export function AdminReportsBulkList({ reports }: { reports: AdminReportRow[] }) {
  const openReports = useMemo(() => reports.filter((r) => r.status === "OPEN"), [reports]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openIds = useMemo(() => openReports.map((r) => r.id), [openReports]);
  const allSelected = openIds.length > 0 && selected.length === openIds.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function runBulk(action: "bulk_resolve_reports" | "bulk_dismiss_reports") {
    if (selected.length === 0) return;
    const label = action === "bulk_resolve_reports" ? "resolve" : "dismiss";
    if (!window.confirm(`${label} ${selected.length} selected report${selected.length === 1 ? "" : "s"}?`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postAdmin({ action, ids: selected });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
      setBusy(false);
    }
  }

  return (
    <>
      {selected.length > 0 ? (
        <div className="admin-bulk-bar panel">
          <span>
            <strong>{selected.length}</strong> selected
          </span>
          <div className="admin-bulk-bar-actions">
            <button
              type="button"
              className="btn btn-sm"
              disabled={busy}
              onClick={() => void runBulk("bulk_resolve_reports")}
            >
              Resolve selected
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => void runBulk("bulk_dismiss_reports")}
            >
              Dismiss selected
            </button>
            <button type="button" className="link-btn" disabled={busy} onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : null}

      {openIds.length > 0 ? (
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : openIds)}
            />
            Select all open on this page
          </label>
        </p>
      ) : null}

      <div className="results">
        {reports.map((r) => (
          <article key={r.id} className="ad-row">
            {r.status === "OPEN" ? (
              <label className="admin-bulk-check">
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  aria-label={`Select report ${r.id}`}
                />
              </label>
            ) : null}
            <strong>
              {r.status} · {r.category || "OTHER"} · {r.targetType} · {r.targetId}
            </strong>
            <p>
              From{" "}
              <Link href={`/admin/users/${r.reporter.id}`}>
                {r.reporter.name} ({r.reporter.email})
              </Link>
              : {r.reason}
            </p>
            <span className="muted">{new Date(r.createdAt).toLocaleString()}</span>
            {r.status === "OPEN" && (
              <div className="admin-actions">
                <AdminActionButton action="report_resolve" id={r.id} label="Resolve" />
                <AdminActionButton action="report_dismiss" id={r.id} label="Dismiss" />
                <AdminActionButton
                  action="report_suspend"
                  id={r.id}
                  label="Suspend reported user"
                  confirm="Suspend the reported user and resolve this report?"
                  danger
                />
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
